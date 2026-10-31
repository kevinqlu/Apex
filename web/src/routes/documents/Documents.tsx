import { getDocuments, uploadDocument } from '../../api/documents';
import { DocumentCard } from '../../components/DocumentCard';
import { DrivingNotice } from '../../components/DrivingNotice';
import { LoadError, Loading } from '../../components/ResourceStatus';
import { formatDay } from '../../lib/format';
import { useResource } from '../../lib/useResource';

export function Documents() {
  const { state, reload, replace } = useResource(getDocuments);

  return (
    <section className="stack">
      <h1>Documents</h1>
      <DrivingNotice />

      {state.status === 'loading' && <Loading what="your documents" />}
      {state.status === 'error' && <LoadError message={state.message} onRetry={reload} />}

      {state.status === 'ready' && (
        <>
          <section className="stack" aria-labelledby="required-docs">
            <h2 id="required-docs">Required documents</h2>
            {state.data.required.map((doc) => (
              <DocumentCard
                key={doc.type}
                title={doc.label}
                status={doc.status}
                file={doc.document}
                onUpload={async (file) => replace(await uploadDocument(doc.type, file))}
              />
            ))}
          </section>

          <section className="stack" aria-labelledby="pod-docs">
            <h2 id="pod-docs">Proof of delivery</h2>
            {state.data.proofOfDelivery.length === 0 ? (
              <p>You have no delivered loads yet. Proof of delivery goes here after you deliver.</p>
            ) : (
              <p>Add a photo or scan of the signed delivery receipt for each delivered load.</p>
            )}
            {state.data.proofOfDelivery.map((pod) => (
              <DocumentCard
                key={pod.load.id}
                title={`Load ${pod.load.id}`}
                detail={`${pod.load.from} to ${pod.load.to}. Delivered ${formatDay(pod.load.deliveredAt)}.`}
                status={pod.status}
                file={pod.document}
                onUpload={async (file) =>
                  replace(await uploadDocument('proof_of_delivery', file, pod.load.id))
                }
              />
            ))}
          </section>
        </>
      )}
    </section>
  );
}
