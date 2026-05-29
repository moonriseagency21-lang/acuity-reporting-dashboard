'use client'

import { useFormStatus } from 'react-dom'

export default function LoginButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        marginTop: 8,
        padding: '12px 24px',
        background: pending ? '#555' : '#111110',
        color: '#ffffff',
        border: 'none',
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        cursor: pending ? 'not-allowed' : 'pointer',
        width: '100%',
        transition: 'background 0.15s',
      }}
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}
