import { post, fmtDate } from '../../api';
import { useAction, useApi } from '../../hooks';
import { useToast } from '../../toast';
import { Button, Card, Empty, ErrorBox, Loading, PageHeader, Textarea } from '../../ui';

type Q = { id: string; question: string; created_at: string; product_name: string; product_slug: string };

/** Customer questions about products you sell. Your answer is shown on the product page for every shopper. */
export default function Questions() {
  const { data, loading, error, reload } = useApi<Q[]>('/questions/open');
  const toast = useToast();
  const send = useAction(async (id: string, answer: string, hide = false) => { await post(`/questions/${id}/answer`, hide ? { hide: true } : { answer }); toast(hide ? 'Question hidden.' : 'Answer published.'); reload(); });
  return (
    <>
      <PageHeader title="Customer questions" sub="Answer honestly and briefly. Do not share personal details. Answers are public." />
      {loading && <Loading />}{error && <ErrorBox message={error} retry={reload} />}
      {data && !data.length && <Empty title="No questions waiting" />}
      <div className="stack">{data?.map((q) => <QCard key={q.id} q={q} busy={send.busy} onSend={(a) => send.run(q.id, a)} onHide={() => send.run(q.id, '', true)} />)}</div>
      {send.error && <ErrorBox message={send.error} />}
    </>
  );
}

function QCard({ q, busy, onSend, onHide }: { q: Q; busy: boolean; onSend: (a: string) => void; onHide: () => void }) {
  return (
    <Card>
      <p><strong>{q.product_name}</strong> <span className="muted small">· {fmtDate(q.created_at)}</span></p>
      <p>“{q.question}”</p>
      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); onSend(String(f.get('a'))); }}>
        <Textarea name="a" rows={2} required minLength={2} maxLength={1000} placeholder="Your answer" aria-label={`Answer about ${q.product_name}`} />
        <div className="row"><Button type="submit" size="sm" busy={busy}>Publish answer</Button><Button type="button" size="sm" variant="ghost" onClick={onHide}>Hide question</Button></div>
      </form>
    </Card>
  );
}
