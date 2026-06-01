// Delad rendering av Elevante-märket ("E") för favicon, apple-icon och
// PWA-ikoner. Ink-fyrkant med ivory Newsreader-E (samma serif som ordmärket).
export function iconElement(size: number) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#faf7f2',
        fontFamily: 'Newsreader',
        fontWeight: 600,
        fontSize: Math.round(size * 0.6),
        lineHeight: 1,
        borderRadius: Math.round(size * 0.2),
      }}
    >
      E
    </div>
  );
}
