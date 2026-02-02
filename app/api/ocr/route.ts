import OpenAI from 'openai'
import { NextResponse } from 'next/server'

type ReceiptItem = {
  name: string
  price: number
  quantity: number
}

type ReceiptResult = {
  items: ReceiptItem[]
  subtotal: number
  tax: number
  tip: number
  total: number
  date: string
  merchant: string
  category: string
}

function coerceNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function coerceText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  return ''
}

export async function POST(request: Request) {
  try {
    const { imageBase64, imageUrl, image } = await request.json()
    
    const base64Input = imageBase64 || image

    if (!base64Input && !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      )
    }

    const rawApiKey = process.env.OPENAI_API_KEY || ''
    const apiKey = rawApiKey.trim().replace(/^['"]|['"]$/g, '')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing OpenAI API key' },
        { status: 500 }
      )
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1'
    const client = new OpenAI({ apiKey })

    let imageDataUrl = ''
    if (base64Input) {
      const base64Data = String(base64Input).replace(/^data:image\/\w+;base64,/, '')
      imageDataUrl = `data:image/jpeg;base64,${base64Data}`
    } else {
      imageDataUrl = String(imageUrl)
    }
    const response = await client.responses.create({
      model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'Extract receipt data from this image and return JSON only.',
                'Use empty strings for unknown text fields and 0 for unknown numbers.',
                'Items should have name, quantity, price (line total).',
                'Return: items, subtotal, tax, tip, total, date, merchant, category.'
              ].join(' ')
            },
            {
              type: 'input_image',
              image_url: imageDataUrl,
              detail: 'high'
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'receipt_extraction',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['items', 'subtotal', 'tax', 'tip', 'total', 'date', 'merchant', 'category'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['name', 'price', 'quantity'],
                  properties: {
                    name: { type: 'string' },
                    price: { type: 'number' },
                    quantity: { type: 'number' }
                  }
                }
              },
              subtotal: { type: 'number' },
              tax: { type: 'number' },
              tip: { type: 'number' },
              total: { type: 'number' },
              date: { type: 'string' },
              merchant: { type: 'string' },
              category: { type: 'string' }
            }
          }
        }
      }
    })

    const rawText = response.output_text
    const parsed: ReceiptResult = JSON.parse(rawText)

    const items = (parsed.items || []).map((item) => ({
      name: coerceText(item.name) || 'Unknown Item',
      price: coerceNumber(item.price),
      quantity: coerceNumber(item.quantity) || 1
    })).filter((item) => item.price > 0)

    const subtotal = coerceNumber(parsed.subtotal)
    const tax = coerceNumber(parsed.tax)
    const tip = coerceNumber(parsed.tip)
    const total = coerceNumber(parsed.total)
    
    // Calculate percentages
    const taxPercent = subtotal > 0 ? (tax / subtotal) * 100 : 0
    const tipPercent = subtotal > 0 ? (tip / subtotal) * 100 : 0
    
    return NextResponse.json({
      success: true,
      data: {
        items,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        tip: parseFloat(tip.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        taxPercent: parseFloat(taxPercent.toFixed(2)),
        tipPercent: parseFloat(tipPercent.toFixed(2)),
        date: coerceText(parsed.date),
        merchant: coerceText(parsed.merchant),
        category: coerceText(parsed.category)
      }
    })
    
  } catch (error: any) {
    console.error('OCR Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process receipt',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
