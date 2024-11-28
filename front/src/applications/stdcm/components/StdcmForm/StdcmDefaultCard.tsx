import StdcmCard from './StdcmCard';

type StdcmCardProps = {
  text: string;
  Icon: React.ReactNode;
  hasTip?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};
const StdcmDefaultCard = ({
  text,
  Icon,
  hasTip = false,
  onClick,
  disabled = false,
  className = 'add-via',
}: StdcmCardProps) => (
  <button type="button" disabled={disabled} onClick={onClick}>
    <StdcmCard hasTip={hasTip} disabled={disabled} className={className}>
      <span className="stdcm-default-card-icon">{Icon}</span>
      <span className="stdcm-default-card-button">{text}</span>
    </StdcmCard>
  </button>
);

export default StdcmDefaultCard;
