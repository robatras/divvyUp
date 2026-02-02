import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER

let client: any = null

// Initialize Twilio client only on server
if (accountSid && authToken) {
  client = twilio(accountSid, authToken)
}

export async function sendBillInvite(
  phoneNumber: string,
  billCode: string,
  organizerName: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!client) {
    return { success: false, error: 'Twilio not configured' }
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const message = await client.messages.create({
      body: `${organizerName} invited you to split a bill on DivvyUp! 🥧\n\nView and claim your items: ${appUrl}/join/${billCode}\n\nBill code: ${billCode}`,
      from: twilioPhone,
      to: phoneNumber,
    })

    return { success: true, sid: message.sid }
  } catch (error: any) {
    console.error('Twilio error:', error)
    return { success: false, error: error.message }
  }
}

export async function sendBillReminder(
  phoneNumber: string,
  billCode: string,
  participantName: string
): Promise<{ success: boolean }> {
  if (!client) {
    return { success: false }
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await client.messages.create({
      body: `Hi ${participantName}! You haven't claimed your items yet on DivvyUp.\n\nClaim here: ${appUrl}/join/${billCode}`,
      from: twilioPhone,
      to: phoneNumber,
    })

    return { success: true }
  } catch (error) {
    console.error('Reminder SMS error:', error)
    return { success: false }
  }
}

export async function sendOrganizerRecoveryCode(
  phoneNumber: string,
  billCode: string,
  recoveryCode: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!client) {
    return { success: false, error: 'Twilio not configured' }
  }

  try {
    await client.messages.create({
      body: `Your DivvyUp organizer recovery code for bill ${billCode} is ${recoveryCode}. It expires in 10 minutes.`,
      from: twilioPhone,
      to: phoneNumber,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Organizer recovery SMS error:', error)
    return { success: false, error: error.message }
  }
}

// Validate phone number format (E.164)
export function validatePhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}

// Format phone number to E.164
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // If it starts with 1 and has 11 digits, it's already formatted
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`
  }
  
  // If it has 10 digits, assume US number
  if (digits.length === 10) {
    return `+1${digits}`
  }
  
  // Otherwise return as-is with + prefix
  return `+${digits}`
}
