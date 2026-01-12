import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import SignInPage from '@/app/auth/signin/page'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('Authentication', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render sign in form', () => {
    render(<SignInPage />)
    
    expect(screen.getByLabelText('E-post')).toBeInTheDocument()
    expect(screen.getByLabelText('Passord')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logg inn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Logg inn med Google/i })).toBeInTheDocument()
  })

  it('should handle successful credential login', async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null })
    
    render(<SignInPage />)
    
    const emailInput = screen.getByLabelText('E-post')
    const passwordInput = screen.getByLabelText('Passord')
    const submitButton = screen.getByRole('button', { name: 'Logg inn' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      })
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('should display error on failed login', async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: 'CredentialsSignin' })
    
    render(<SignInPage />)
    
    const emailInput = screen.getByLabelText('E-post')
    const passwordInput = screen.getByLabelText('Passord')
    const submitButton = screen.getByRole('button', { name: 'Logg inn' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Ugyldig e-post eller passord')).toBeInTheDocument()
    })
  })

  it('should handle Google sign in', () => {
    render(<SignInPage />)
    
    const googleButton = screen.getByRole('button', { name: /Logg inn med Google/i })
    fireEvent.click(googleButton)
    
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
  })
})