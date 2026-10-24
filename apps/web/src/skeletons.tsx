/** Grey placeholder shapes shown while content loads, in the same layout as the real thing so the page does not jump. They announce "Loading" once to screen readers. */
const Live = ({ label }: { label: string }) => <span className="sr-only" role="status">{label}</span>;

export const SkelBlock = ({ h = 16, w = '100%', r = 6, style }: { h?: number | string; w?: number | string; r?: number; style?: React.CSSProperties }) => <span className="skel" aria-hidden="true" style={{ display: 'block', height: h, width: w, borderRadius: r, ...style }} />;

/** A grid of product-card placeholders (search, store, collections, deals). */
export function SkelGrid({ n = 8, label = 'Loading products' }: { n?: number; label?: string }) {
  return (
    <div aria-busy="true">
      <Live label={label} />
      <ul className="pgrid skel-grid" aria-hidden="true">{Array.from({ length: n }, (_, i) => (
        <li key={i} className="pcard skel-card"><span className="skel skel-img" /><div className="pbody"><SkelBlock h={22} w="45%" /><SkelBlock h={12} w="30%" /><SkelBlock h={14} w="90%" /><SkelBlock h={14} w="60%" /><SkelBlock h={34} r={999} style={{ marginTop: 6 }} /></div></li>))}</ul>
    </div>
  );
}

/** Rows with a small picture and two lines (baskets, orders, lists, stores). */
export function SkelRows({ n = 4, label = 'Loading' }: { n?: number; label?: string }) {
  return (
    <div aria-busy="true" className="skel-rows">
      <Live label={label} />
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="panel skel-row" aria-hidden="true"><span className="skel skel-thumb" /><div style={{ flex: 1, display: 'grid', gap: 8 }}><SkelBlock h={16} w="55%" /><SkelBlock h={12} w="35%" /></div><SkelBlock h={16} w={56} /></div>))}
    </div>
  );
}

/** Product page: picture, name, price box, then a few lines of detail. */
export function SkelPdp() {
  return (
    <div aria-busy="true" className="pdp skel-pdp">
      <Live label="Loading product" />
      <div className="pdp-gallery" aria-hidden="true"><span className="skel pdp-main" style={{ display: 'block' }} /></div>
      <div className="pdp-info" aria-hidden="true" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
        <SkelBlock h={14} w="30%" /><SkelBlock h={28} w="75%" /><SkelBlock h={14} w="40%" /><SkelBlock h={14} w="90%" /><SkelBlock h={14} w="80%" /><SkelBlock h={14} w="60%" />
      </div>
      <div className="buybox" aria-hidden="true"><SkelBlock h={34} w="40%" /><SkelBlock h={14} w="30%" /><SkelBlock h={40} /><SkelBlock h={46} r={999} /></div>
    </div>
  );
}

/** Store or kitchen page: banner and then products. */
export function SkelStore() {
  return (
    <div aria-busy="true">
      <Live label="Loading store" />
      <div aria-hidden="true" style={{ display: 'grid', gap: 10, marginBottom: 14 }}><SkelBlock h={140} r={14} /><SkelBlock h={26} w="50%" /><SkelBlock h={14} w="70%" /></div>
      <SkelGrid n={6} />
    </div>
  );
}

/** Whole-page placeholder while a page's code loads. */
export const SkelPage = () => (
  <div className="wrap" aria-busy="true"><Live label="Loading page" /><div aria-hidden="true" style={{ display: 'grid', gap: 12, marginTop: 16 }}><SkelBlock h={30} w="40%" /><SkelBlock h={14} w="70%" /><SkelRows n={3} /></div></div>
);

/** A horizontal shelf of cards (home page). */
export function SkelShelf({ n = 5 }: { n?: number }) {
  return (
    <div aria-busy="true" style={{ margin: '16px 0' }}><Live label="Loading" />
      <div aria-hidden="true"><SkelBlock h={22} w="35%" style={{ marginBottom: 10 }} /><div style={{ display: 'flex', gap: 10, overflow: 'hidden' }}>{Array.from({ length: n }, (_, i) => <div key={i} style={{ flex: '0 0 150px' }}><span className="skel" style={{ display: 'block', aspectRatio: '1', borderRadius: 12, marginBottom: 8 }} /><SkelBlock h={14} w="80%" /><SkelBlock h={14} w="50%" style={{ marginTop: 6 }} /></div>)}</div></div>
    </div>
  );
}
