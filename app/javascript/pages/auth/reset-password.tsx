import { AccountForm } from '../../components/account-form';
export default function Page({ reset_password_token }: { reset_password_token: string }) { return <AccountForm mode="reset-password" token={reset_password_token} />; }
