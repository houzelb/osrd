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
  <StdcmCard hasTip={hasTip} disabled={disabled} className={className}>
    <button type="button" onClick={onClick}>
      <span className="stdcm-default-card-icon">{Icon}</span>
      <span className="stdcm-default-card-button">{text}</span>
    </button>
  </StdcmCard>
);

export default StdcmDefaultCard;
