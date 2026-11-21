/** Plain-text metadata from Wikimedia Commons; never render source HTML. */
export default function DestinationPhotoCredit({ credit, compact = false, className = "" }) {
  if (!credit) return null;
  if (compact) return (
    <p className={`text-label-sm leading-relaxed text-c57-on-surface-variant ${className}`}>
      Foto: <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-c57-primary">{credit.author}</a>
      {" · "}<a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-c57-primary">{credit.license}</a>
    </p>
  );
  return (
    <div className={`text-body-sm leading-relaxed text-c57-on-surface-variant ${className}`}>
      <p>
        Foto: {credit.author}.{" "}
        <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-c57-primary">Wikimedia Commons</a>
        {" · "}
        <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-c57-primary">{credit.license}</a>.
      </p>
      {credit.attribution && <p>{credit.attribution}</p>}
      <p>{credit.changes}</p>
    </div>
  );
}
