import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { Load } from '../../api/loads';
import { createTicket, type TicketList } from '../../api/support';
import { DrivingNotice } from '../../components/DrivingNotice';
import { Icon } from '../../components/Icon';

const MIN = 10;
const MAX = 1000;

interface Props {
  categories: TicketList['categories'];
  loads: Load[];
  onSent: (list: TicketList) => void;
}

export function TicketForm({ categories, loads, onSent }: Props) {
  const [category, setCategory] = useState('');
  const [loadId, setLoadId] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ category?: string; message?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSentId(null);
    setFormError(null);

    const next: typeof errors = {};
    if (!category) next.category = 'Choose what your message is about.';
    const length = message.trim().length;
    if (length < MIN) next.message = `Tell us what is going on, in at least ${MIN} characters.`;
    if (length > MAX) next.message = `Keep your message under ${MAX.toLocaleString()} characters.`;
    setErrors(next);
    if (next.category || next.message) return;

    setBusy(true);
    try {
      const list = await createTicket({ category, loadId: loadId || undefined, message });
      onSent(list);
      setSentId(list.tickets[0]?.id ?? null);
      setCategory('');
      setLoadId('');
      setMessage('');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card task-form" onSubmit={(e) => void submit(e)} noValidate>
      <h2>Send a message</h2>
      <DrivingNotice />

      {sentId && (
        <p className="message message-ok" role="status">
          <Icon name="checkCircle" />
          <span>Your message was sent. Your ticket number is {sentId}.</span>
        </p>
      )}

      <label htmlFor="ticket-category">What is this about?</label>
      <select
        id="ticket-category"
        value={category}
        aria-invalid={!!errors.category}
        aria-describedby={errors.category ? 'ticket-category-error' : undefined}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">Choose one</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      {errors.category && (
        <p id="ticket-category-error" className="field-error" role="alert">
          <Icon name="error" />
          {errors.category}
        </p>
      )}

      <label htmlFor="ticket-load">Which load? (optional)</label>
      <select id="ticket-load" value={loadId} onChange={(e) => setLoadId(e.target.value)}>
        <option value="">Not about a load</option>
        {loads.map((l) => (
          <option key={l.id} value={l.id}>
            {l.id}, {l.origin.city} to {l.destination.city}
          </option>
        ))}
      </select>

      <label htmlFor="ticket-message">Your message</label>
      <textarea
        id="ticket-message"
        rows={5}
        value={message}
        aria-invalid={!!errors.message}
        aria-describedby={errors.message ? 'ticket-message-error' : 'ticket-message-count'}
        onChange={(e) => setMessage(e.target.value)}
      />
      <p id="ticket-message-count" className="field-hint">
        {message.trim().length} of {MAX.toLocaleString()} characters
      </p>
      {errors.message && (
        <p id="ticket-message-error" className="field-error" role="alert">
          <Icon name="error" />
          {errors.message}
        </p>
      )}

      {formError && (
        <p className="message message-error" role="alert">
          <Icon name="error" />
          <span>{formError}</span>
        </p>
      )}

      <button type="submit" className="button button-primary" disabled={busy}>
        {busy ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
