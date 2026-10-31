import { Icon } from './Icon';

// A real tel: link, so a tap on a phone starts the call. The number is shown as text too.
export function CallButton({
  phone,
  children,
  large = false,
}: {
  phone: string;
  children: string;
  large?: boolean;
}) {
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      className={large ? 'button button-primary call call-large' : 'button button-primary call'}
    >
      <Icon name="phone" />
      <span>
        {children} <strong>{phone}</strong>
      </span>
    </a>
  );
}
