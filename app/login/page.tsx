import { login } from './actions'
import LoginButton from '@/components/LoginButton'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main style={{
      minHeight: '100vh',
      background: '#F8F8F8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderTop: '4px solid #0047AB',
        borderRadius: 18,
        padding: '40px 48px',
        width: '100%',
        maxWidth: 420,
      }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 700, color: '#333333' }}>
            Acuity Reporting
          </h1>
          <p style={{ margin: 0, color: '#636466', fontSize: 15 }}>
            Good Vacation Getaways
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fff3f2',
            border: '1px solid #FF6F61',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20,
            color: '#FF6F61',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: '#333333' }}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                fontSize: 15,
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: '#333333' }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                fontSize: 15,
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <LoginButton />
        </form>
      </div>
    </main>
  )
}
