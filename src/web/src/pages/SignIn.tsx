import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError, get, post } from '../api';
import { useForm } from '../hooks';
import { Logo, Icon } from '../ui/Icon';
import { FormError, StateMessage, TextInput } from '../ui/kit';
import { computerZone } from '../ui/pickers';
import { cx, frameCss } from '../vt/frame';

// Forms sign-in screens (Security/AuthEndpoints.cs). They render outside the application shell.

type AuthConfig = { mode: string; setupRequired: boolean; passwordRule: string };

/** Only same-site relative paths are followed after sign-in (no open redirect). */
const safeReturn = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/login') ? v : '/');

/** VtWebGuiFramework frame header and footer around a card laid out like the framework's Login popup (title, fields, actions). */
function AuthFrame({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  const f = frameCss;
  return (
    <div className="auth-page">
      <header className={cx(f.header.header, 'hdr auth-hdr')}><span className={f.logo.headerLogo}><Logo /></span></header>
      <main className="auth-main" id="main">
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-product">TIO Operations Hub</div>
          <h1 id="auth-title">{title}</h1>
          {sub && <p className="hint">{sub}</p>}
          {children}
        </section>
      </main>
      <footer className={cx(f.footer.footer, 'status')}><span>© VITRONIC</span><span className="app">TIO Operations Hub</span></footer>
    </div>
  );
}

export function LoginPage() {
  const cfg = useQuery({ queryKey: ['auth-config'], queryFn: () => get<AuthConfig>('/auth/config') });
  if (cfg.isLoading) return <AuthFrame title="Sign in"><StateMessage kind="loading" /></AuthFrame>;
  if (cfg.data && cfg.data.mode.toLowerCase() !== 'forms') {
    return <AuthFrame title="Sign in" sub="This installation uses Windows sign-in. Open the hub again; your organization account is used automatically."><Link className="btn btn-primary" to="/">Open the hub</Link></AuthFrame>;
  }
  if (cfg.data?.setupRequired) return <SetupForm rule={cfg.data.passwordRule} />;
  return <SignInForm />;
}

function SignInForm() {
  const [sp] = useSearchParams();
  const f = useForm({ accountName: '', password: '' });
  const account = useRef<HTMLInputElement>(null);
  useEffect(() => { document.title = 'Sign in · TIO Operations Hub'; account.current?.focus(); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await f.submit(v => post<{ mustChangePassword: boolean }>('/auth/login', v));
    if (r) location.assign(r.mustChangePassword ? '/account/password' : safeReturn(sp.get('returnUrl')));
    else f.set('password', '');
  };
  return (
    <AuthFrame title="Sign in" sub={sp.get('signedOut') ? 'You have signed out.' : undefined}>
      <form onSubmit={submit} noValidate>
        {f.error && <div className="notice bad" role="alert">{f.error.status === 401 ? f.error.detail : f.error.summary}</div>}
        <div className="auth-fields">
          <AuthInput inputRef={account} label="Account name" autoComplete="username" value={f.values.accountName} onChange={v => f.set('accountName', v)} />
          <AuthInput label="Password" type="password" autoComplete="current-password" value={f.values.password} onChange={v => f.set('password', v)} />
        </div>
        <button className="btn btn-primary auth-submit" disabled={f.busy || !f.values.accountName || !f.values.password}><Icon name="lock" size={14} /> Sign in</button>
        <p className="hint">Forgot your password? Ask the TIO Manager to issue a temporary one.</p>
      </form>
    </AuthFrame>
  );
}

function SetupForm({ rule }: { rule: string }) {
  const f = useForm({ setupCode: '', accountName: '', displayName: '', password: '', confirm: '' });
  const [mismatch, setMismatch] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.values.password !== f.values.confirm) { setMismatch(true); return; }
    setMismatch(false);
    const { confirm: _, ...body } = f.values;
    const r = await f.submit(() => post('/auth/setup', { ...body, timeZone: computerZone() }));
    if (r) location.assign('/admin/users');
  };
  return (
    <AuthFrame title="Set up the first TIO Manager"
      sub={<>No TIO Manager can sign in yet. Enter the one-time setup code from the file <code>App_Data\setup-code.txt</code> in the application folder on the server, then choose the TIO Manager account. The code stops working once this is done.</>}>
      <form onSubmit={submit} noValidate>
        <FormError error={f.error} />
        <div className="auth-fields">
          <TextInput label="Setup code" required value={f.values.setupCode} onChange={v => f.set('setupCode', v)} error={f.fieldError('setupCode')} />
          <TextInput label="TIO Manager account name" required value={f.values.accountName} onChange={v => f.set('accountName', v)} error={f.fieldError('accountName')} hint="For example laith.hamdan. The TIO Manager administers users and settings and works on all clients." />
          <TextInput label="Display name" required value={f.values.displayName} onChange={v => f.set('displayName', v)} error={f.fieldError('displayName')} />
          <PasswordPair f={f} rule={rule} mismatch={mismatch} field="password" />
        </div>
        <button className="btn btn-primary auth-submit" disabled={f.busy}>Create TIO Manager and sign in</button>
      </form>
    </AuthFrame>
  );
}

/** One labelled input: the label names only the field; hint and error are linked with aria-describedby. */
function AuthInput({ label, required, type = 'text', autoComplete, value, onChange, hint, error, inputRef }: {
  label: string; required?: boolean; type?: string; autoComplete?: string; value: string; onChange: (v: string) => void; hint?: string; error?: string; inputRef?: React.Ref<HTMLInputElement>;
}) {
  const id = useId();
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="auth-field">
      <label htmlFor={id} className={required ? 'req' : undefined}>{label}</label>
      <input id={id} ref={inputRef} className="input" type={type} autoComplete={autoComplete} value={value} onChange={e => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={desc} />
      {error ? <span className="err" id={`${id}-err`}>{error}</span> : hint ? <span className="hint" id={`${id}-hint`}>{hint}</span> : null}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PasswordPair({ f, rule, mismatch, field, label = 'Password' }: { f: any; rule: string; mismatch: boolean; field: string; label?: string }) {
  return (<>
    <AuthInput label={label} required type="password" autoComplete="new-password" value={f.values[field]} onChange={v => f.set(field, v)} hint={rule} error={f.fieldError(field)} />
    <AuthInput label="Repeat the password" required type="password" autoComplete="new-password" value={f.values.confirm} onChange={v => f.set('confirm', v)} error={mismatch ? 'The two passwords are different.' : undefined} />
  </>);
}

export function ChangePasswordPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: () => get<{ account: string; displayName: string; app: { mustChangePassword: boolean } }>('/me') });
  const cfg = useQuery({ queryKey: ['auth-config'], queryFn: () => get<AuthConfig>('/auth/config') });
  const f = useForm({ currentPassword: '', newPassword: '', confirm: '' });
  const [mismatch, setMismatch] = useState(false);
  const [done, setDone] = useState(false);
  const forced = !!me.data?.app.mustChangePassword;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.values.newPassword !== f.values.confirm) { setMismatch(true); return; }
    setMismatch(false);
    const ok = await f.submit(v => post('/auth/password', { currentPassword: v.currentPassword, newPassword: v.newPassword }).then(() => true));
    if (ok) setDone(true);
  };
  if (me.error instanceof ApiError && me.error.status === 401) return null; // redirected to sign-in
  if (done) return (
    <AuthFrame title="Password changed" sub="Your other sessions have been signed out.">
      <button className="btn btn-primary auth-submit" onClick={() => location.assign('/')}>Continue to the hub</button>
    </AuthFrame>
  );
  return (
    <AuthFrame title={forced ? 'Choose a new password' : 'Change password'}
      sub={me.data && <>Signed in as <b>{me.data.account}</b>.{forced && ' The TIO Manager issued a temporary password; choose your own before continuing.'}</>}>
      <form onSubmit={submit} noValidate>
        <FormError error={f.error} />
        <div className="auth-fields">
          <AuthInput label={forced ? 'Temporary password' : 'Current password'} required type="password" autoComplete="current-password" value={f.values.currentPassword}
            onChange={v => f.set('currentPassword', v)} error={f.fieldError('currentPassword')} />
          <PasswordPair f={f} rule={cfg.data?.passwordRule ?? ''} mismatch={mismatch} field="newPassword" label="New password" />
        </div>
        <button className="btn btn-primary auth-submit" disabled={f.busy}>Change password</button>
        <div className="auth-links">
          {!forced && <Link to="/">Back to the hub</Link>}
          <button type="button" className="linkbtn" onClick={signOut}>Sign out</button>
        </div>
      </form>
    </AuthFrame>
  );
}

export async function signOut() {
  try { await post('/auth/logout'); } finally { location.assign('/login?signedOut=1'); }
}
