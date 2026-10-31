import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { PROOF_OF_DELIVERY, requiredDocumentTypes } from '../config/documentTypes.js';
import type { OnboardingTemplate } from '../config/onboarding.js';
import { buildDocumentCenter, findOwnedDocument, saveDocument } from '../db/documents.js';
import type { Db } from '../db/index.js';
import { findLoad } from '../db/loads.js';
import { currentDriver } from '../middleware/auth.js';
import { sendError } from '../middleware/errors.js';
import {
  ALLOWED_EXTENSIONS,
  extensionOf,
  MAX_UPLOAD_BYTES,
  MIME_FOR,
  sniffKind,
} from '../uploads/fileType.js';

const BAD_TYPE = 'That file type is not allowed. Upload a PDF, JPG, PNG, or HEIC file.';

// Mounted behind requireSession. The driver comes from the session, never from the request.
export function documentsRouter(db: Db, template: OnboardingTemplate, uploadsDir: string): Router {
  const router = Router();
  // In memory until every check passes, so a rejected file never touches disk.
  const receive = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
  }).single('file');

  const parseUpload = (req: Request, res: Response) =>
    new Promise<void>((resolve, reject) => {
      receive(req, res, (err: unknown) => (err ? reject(err) : resolve()));
    });

  router.get('/', (_req, res) => {
    res.json(buildDocumentCenter(db, template, currentDriver(res).id));
  });

  router.post('/', async (req, res) => {
    const driver = currentDriver(res);
    try {
      await parseUpload(req, res);
    } catch (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        sendError(res, 413, 'file_too_large', 'That file is too large. The limit is 10 MB.');
      } else {
        sendError(res, 400, 'bad_upload', 'We could not read that upload. Try again.');
      }
      return;
    }

    const file = req.file;
    if (!file) {
      sendError(res, 400, 'no_file', 'Choose a file to upload.');
      return;
    }

    const { type, loadId } = req.body as Record<string, unknown>;
    const allowedTypes = [...requiredDocumentTypes(template), PROOF_OF_DELIVERY];
    if (typeof type !== 'string' || !allowedTypes.includes(type)) {
      sendError(res, 400, 'bad_document_type', 'That kind of document is not on your list.');
      return;
    }

    let forLoad: string | null = null;
    if (type === PROOF_OF_DELIVERY) {
      // A proof of delivery belongs to one of this driver's own delivered loads.
      const load = typeof loadId === 'string' ? findLoad(db, driver.id, loadId) : undefined;
      if (!load) {
        sendError(res, 404, 'not_found', 'We could not find that load.');
        return;
      }
      if (load.status !== 'delivered') {
        sendError(
          res,
          400,
          'not_delivered',
          'You can add proof of delivery after the load is delivered.',
        );
        return;
      }
      forLoad = load.id;
    }

    // Both the name and the file's real contents must be an allowed type.
    const kind = sniffKind(file.buffer);
    const extension = extensionOf(file.originalname);
    if (!kind || !(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
      sendError(res, 415, 'bad_file_type', BAD_TYPE);
      return;
    }

    const storedName = `${randomBytes(16).toString('hex')}.${kind}`;
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, storedName), file.buffer);

    let replaced: string[];
    try {
      replaced = saveDocument(db, driver.id, {
        type,
        loadId: forLoad,
        // Only the base name, in case a client sends a path.
        originalName: path.basename(file.originalname),
        storedName,
        size: file.size,
        mime: MIME_FOR[kind],
      });
    } catch (err) {
      fs.rmSync(path.join(uploadsDir, storedName), { force: true });
      throw err;
    }
    for (const name of replaced)
      fs.rmSync(path.join(uploadsDir, path.basename(name)), { force: true });

    res.status(201).json(buildDocumentCenter(db, template, driver.id));
  });

  // Only way to a file; ownership is checked and uploads/ is never served directly.
  router.get('/:id/file', (req, res) => {
    const doc = findOwnedDocument(db, currentDriver(res).id, req.params.id);
    if (!doc) {
      sendError(res, 404, 'not_found', 'We could not find that file.');
      return;
    }
    const file = path.join(uploadsDir, path.basename(doc.stored_name));
    if (!fs.existsSync(file)) {
      sendError(res, 404, 'file_missing', 'That file is no longer available. Upload it again.');
      return;
    }
    res.set('X-Content-Type-Options', 'nosniff');
    res.download(file, doc.original_name);
  });

  return router;
}
