import { useState } from 'react';
import type { Load } from '../api/loads';
import { formatWeight, formatWhen } from '../lib/format';
import { Icon } from './Icon';
import { RouteStrip } from './RouteStrip';
import { StatusChip } from './StatusChip';

export function LoadCard({ load, startOpen = false }: { load: Load; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const detailsId = `load-details-${load.id}`;

  return (
    <article className="card load-card">
      <header className="load-head">
        <h2 className="load-id">{load.id}</h2>
        <StatusChip status={load.status} />
      </header>

      <RouteStrip load={load} />

      {load.delayNote && (
        <p className="message message-caution">
          <Icon name="warning" />
          <span>{load.delayNote}</span>
        </p>
      )}

      <p className="load-times">
        {load.status === 'delivered' ? 'Delivered' : 'Delivery'} {formatWhen(load.deliveryAt)}
      </p>

      <button
        type="button"
        className="button button-quiet load-toggle"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide details' : 'Show details'}
        <span className={open ? 'chevron chevron-open' : 'chevron'}>
          <Icon name="chevron" />
        </span>
      </button>

      {open && (
        <dl id={detailsId} className="load-details">
          <dt>Pickup</dt>
          <dd>
            {load.origin.facility}
            <br />
            {load.origin.city}, {load.origin.state}
            <br />
            {formatWhen(load.pickupAt)}
          </dd>
          <dt>Delivery</dt>
          <dd>
            {load.destination.facility}
            <br />
            {load.destination.city}, {load.destination.state}
            <br />
            {formatWhen(load.deliveryAt)}
          </dd>
          <dt>Cargo</dt>
          <dd>{load.cargoDescription}</dd>
          <dt>Weight</dt>
          <dd>{formatWeight(load.weightLb)}</dd>
          <dt>Equipment</dt>
          <dd>{load.equipment}</dd>
          {load.reference && (
            <>
              <dt>Reference</dt>
              <dd>{load.reference}</dd>
            </>
          )}
        </dl>
      )}
    </article>
  );
}
