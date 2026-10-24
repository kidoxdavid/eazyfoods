import { Link } from 'react-router-dom';
import { post } from '../api';
import { useAuth } from '../auth';
import { useAction } from '../hooks';
import { useToast } from '../toast';
import { Button, Field, Input, Notice, Textarea } from '../ui';
import { ContentPage } from './ContentPage';

function Contact() {
  const { me } = useAuth(); const toast = useToast();
  const send = useAction(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    await post('/support/contact', { subject: String(f.get('subject')), message: String(f.get('message')) }); toast('Thanks. Our team will reply by email.'); (e.target as HTMLFormElement).reset();
  });
  return (
    <section className="panel" aria-label="Contact support"><h2 style={{ marginTop: 0 }}>Contact support</h2>
      {!me ? <p><Link to="/signin?next=/help">Sign in</Link> to send us a message, so we can find your orders.</p> : (
        <form onSubmit={send.run}>
          <Field label="Subject"><Input name="subject" required minLength={3} maxLength={120} /></Field>
          <Field label="How can we help?"><Textarea name="message" required minLength={10} maxLength={2000} rows={4} /></Field>
          {send.error && <Notice tone="error">{send.error}</Notice>}
          <Button type="submit" busy={send.busy}>Send</Button>
          <p className="small muted">Problem with a specific order? Open the order and choose “Report a problem”.</p>
        </form>)}
    </section>
  );
}

/** The FAQ is a normal content page (editable by staff); the contact form sits under it. */
export function HelpPage() {
  return <><ContentPage slugOverride="help-centre" /><Contact /></>;
}
