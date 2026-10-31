import { Icon } from './Icon';

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
