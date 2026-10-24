import { useParams } from 'react-router-dom';
import { post } from '../api';
import { useAction, useApi } from '../hooks';
import { Button, ErrorBox, Loading, Notice } from '../ui';

/** One click, no sign-in. The token in the link says which email this came from. */
export function Unsubscribe() {
  const { token } = useParams();
  const info = useApi<{ email: string; subscribed: boolean }>(`/m/u/${token}`);
  const go = useAction(async () => { await post(`/m/u/${token}`); info.reload(); });
  return (
    <div className="auth">
      <h1>Unsubscribe</h1>
      {info.loading && <Loading />}
      {info.error && <ErrorBox message="This unsubscribe link is not valid. You can also turn marketing email off in your account settings." />}
      {info.data && (info.data.subscribed
        ? <><p>Stop marketing emails to <strong>{info.data.email}</strong>?</p>{go.error && <Notice tone="error">{go.error}</Notice>}<Button size="lg" busy={go.busy} onClick={() => go.run()}>Unsubscribe me</Button><p className="small muted">You will still get emails about your orders and account.</p></>
        : <Notice tone="ok">{info.data.email} is unsubscribed from marketing email. You will still get emails about your orders and account.</Notice>)}
    </div>
  );
}
