import { getLoads } from '../../api/loads';
import { getSupport, getTickets } from '../../api/support';
import { CallButton } from '../../components/CallButton';
import { Icon } from '../../components/Icon';
import { LoadError, Loading } from '../../components/ResourceStatus';
import { formatWhen } from '../../lib/format';
import { useResource } from '../../lib/useResource';
import { TicketForm } from './TicketForm';

export function Help() {
  const support = useResource(getSupport);
  const tickets = useResource(getTickets);
  const loads = useResource(getLoads);

  return (
    <section className="stack">
      <h1>Help</h1>

      {support.state.status === 'loading' && <Loading what="contacts" />}
      {support.state.status === 'error' && (
        <LoadError message={support.state.message} onRetry={support.reload} />
      )}
      {support.state.status === 'ready' && (
        <>
          <section className="roadside" aria-labelledby="roadside-title">
            <h2 id="roadside-title">{support.state.data.roadside.label}</h2>
            <p>{support.state.data.roadside.hours}.</p>
            <CallButton phone={support.state.data.roadside.phone} large>
              Call roadside
            </CallButton>
          </section>

          <section className="card" aria-labelledby="contacts-title">
            <h2 id="contacts-title">Your contacts</h2>
            <p className="contact-name">Dispatcher: {support.state.data.dispatcher.name}</p>
            <CallButton phone={support.state.data.dispatcher.phone}>Call dispatcher</CallButton>
            <p className="contact-name">
              Terminal support, {support.state.data.terminal.name}.{' '}
              {support.state.data.terminal.hours}.
            </p>
            <CallButton phone={support.state.data.terminal.phone}>Call terminal</CallButton>
          </section>
        </>
      )}

      {tickets.state.status === 'loading' && <Loading what="your messages" />}
      {tickets.state.status === 'error' && (
        <LoadError message={tickets.state.message} onRetry={tickets.reload} />
      )}
      {tickets.state.status === 'ready' && (
        <>
          <TicketForm
            categories={tickets.state.data.categories}
            loads={loads.state.status === 'ready' ? loads.state.data.loads : []}
            onSent={tickets.replace}
          />

          <section className="stack" aria-labelledby="tickets-title">
            <h2 id="tickets-title">Your messages</h2>
            {tickets.state.data.tickets.length === 0 && (
              <p>You have not sent any messages yet. Use the form above if you need help.</p>
            )}
            {tickets.state.data.tickets.map((t) => (
              <article key={t.id} className="card ticket">
                <header className="task-head">
                  <h3 className="task-title">{t.categoryLabel}</h3>
                  <span className="chip">
                    <Icon name="hourglass" />
                    {t.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </header>
                <p className="task-due">
                  Ticket {t.id}
                  {t.loadId ? `, load ${t.loadId}` : ''}. Sent {formatWhen(t.createdAt)}.
                </p>
                <p className="task-description">{t.message}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
