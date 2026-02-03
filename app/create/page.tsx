'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Plus,
  Trash2,
  Users,
  Receipt,
  Loader2,
  Check,
  Upload,
  GripVertical
} from 'lucide-react'
import Link from 'next/link'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ItemInput {
  id: string
  name: string
  price: string
  quantity: number
}

interface ParticipantInput {
  name: string
  plusOneCount: number
}

type Step = 'receipt' | 'items' | 'participants' | 'review'

export default function CreateBillPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('receipt')
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [nextItemId, setNextItemId] = useState(1)

  // Form state
  const [receiptImage, setReceiptImage] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [items, setItems] = useState<ItemInput[]>([{ id: 'item-0', name: '', price: '', quantity: 1 }])
  const [participants, setParticipants] = useState<ParticipantInput[]>([{ name: '', plusOneCount: 0 }])
  const [taxAmount, setTaxAmount] = useState('')
  const [tipAmount, setTipAmount] = useState('')
  const [ocrData, setOcrData] = useState<any>(null)
  const [organizerPhone, setOrganizerPhone] = useState('')

  const steps: Step[] = ['receipt', 'items', 'participants', 'review']
  const currentStepIndex = steps.indexOf(step)

  const formatUSPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setReceiptImage(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => setReceiptPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Run OCR
    setOcrLoading(true)
    try {
      const base64 = await resizeImageToBase64(file)
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      })

      const result = await response.json()
      if (result.success && result.data) {
        setOcrData(result.data)
        // Populate items from OCR
        if (result.data.items && result.data.items.length > 0) {
          const mapped = result.data.items.map((item: any, index: number) => ({
            id: `item-${index}`,
            name: item.name,
            price: item.price.toString(),
            quantity: item.quantity || 1
          }))
          setItems(mapped)
          setNextItemId(mapped.length)
        }
        const taxValue = Number(result.data.tax ?? 0)
        const tipValue = Number(result.data.tip ?? 0)
        if (Number.isFinite(taxValue)) setTaxAmount(taxValue.toFixed(2))
        if (Number.isFinite(tipValue)) setTipAmount(tipValue.toFixed(2))
      }
    } catch (error) {
      console.error('OCR failed:', error)
    } finally {
      setOcrLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, { id: `item-${nextItemId}`, name: '', price: '', quantity: 1 }])
    setNextItemId((prev) => prev + 1)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ItemInput, value: string | number) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const addParticipant = () => {
    setParticipants([...participants, { name: '', plusOneCount: 0 }])
  }

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const incrementPlusOne = (index: number) => {
    setParticipants((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], plusOneCount: next[index].plusOneCount + 1 }
      return next
    })
  }

  const decrementPlusOne = (index: number) => {
    setParticipants((prev) => {
      const next = [...prev]
      if (next[index].plusOneCount > 0) {
        next[index] = { ...next[index], plusOneCount: next[index].plusOneCount - 1 }
      }
      return next
    })
  }

  const updateParticipant = (index: number, field: keyof ParticipantInput, value: string) => {
    const updated = [...participants]
    updated[index] = { ...updated[index], [field]: value }
    setParticipants(updated)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0
      return sum + price
    }, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = parseFloat(taxAmount) || 0
    const tip = parseFloat(tipAmount) || 0
    return subtotal + tax + tip
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    setItems((prev) => arrayMove(prev, oldIndex, newIndex))
  }

  const canProceed = () => {
    switch (step) {
      case 'receipt':
        return true // Receipt is optional
      case 'items':
        return items.some(item => item.name && item.price)
      case 'participants':
        return participants.some(p => p.name) && !!organizerPhone.trim()
      case 'review':
        return true
    }
  }

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex])
    }
  }

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(steps[prevIndex])
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (!organizerPhone.trim()) {
        alert('Organizer phone number is required for recovery.')
        setLoading(false)
        return
      }

      // Upload receipt if exists
      let receiptImageUrl = null
      if (receiptImage) {
        const formData = new FormData()
        formData.append('file', receiptImage)
        // For now, we'll pass base64 to API which can handle upload
        receiptImageUrl = receiptPreview
      }

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.filter(i => i.name && i.price).map(i => ({
            name: i.name,
            price: parseFloat(i.price),
            quantity: i.quantity
          })),
          participants: participants.filter(p => p.name).map(p => ({
            name: p.name,
            plusOneCount: p.plusOneCount
          })),
          taxAmount: parseFloat(taxAmount) || 0,
          tipAmount: parseFloat(tipAmount) || 0,
          receiptImageUrl,
          ocrData,
          organizerPhone
        })
      })

      const result = await response.json()
      if (result.success) {
        // Redirect to bill page
        const organizerCode = result.data.organizerAccessCode
        router.push(`/organizer/${organizerCode}`)
      } else {
        alert('Failed to create bill: ' + result.error)
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('Failed to create bill')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <h1 className="text-3xl font-bold">Create Bill</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  i <= currentStepIndex
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white'
                    : 'bg-white/20 text-white/60'
                }`}
              >
                {i < currentStepIndex ? <Check size={20} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 sm:w-20 h-1 mx-2 rounded ${
                  i < currentStepIndex ? 'bg-primary' : 'bg-white/20'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 mb-6 animate-fade-in">
          {step === 'receipt' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Receipt</h2>
                <p className="text-gray-600">We'll extract items automatically (optional)</p>
              </div>

              <label className="block">
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                  receiptPreview ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
                }`}>
                  {ocrLoading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 size={48} className="animate-spin text-primary" />
                      <p className="text-gray-600">Doing receipt math wizardry...</p>
                    </div>
                  ) : receiptPreview ? (
                    <div className="space-y-4">
                      <img
                        src={receiptPreview}
                        alt="Receipt"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <p className="text-primary font-medium">
                        {ocrData ? `Found ${ocrData.items?.length || 0} items` : 'Receipt uploaded'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Upload size={32} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">Click to upload receipt</p>
                        <p className="text-gray-500 text-sm">or drag and drop</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReceiptUpload}
                />
              </label>

              <button
                onClick={handleNext}
                className="w-full text-primary font-medium py-3"
              >
                Skip, I'll enter items manually
              </button>
            </div>
          )}

          {step === 'items' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Items</h2>
                <p className="text-gray-600">What did everyone order?</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3 items-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <div className="w-6" aria-hidden="true" />
                  <div className="flex-1">Item</div>
                  <div className="w-24 text-center">Total</div>
                  <div className="w-16 text-center">Qty</div>
                  <div className="w-10" aria-hidden="true" />
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                    {items.map((item, index) => (
                      <SortableItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        onChange={updateItem}
                        onRemove={removeItem}
                        showRemove={items.length > 1}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              <button
                onClick={addItem}
                className="flex items-center gap-2 text-primary font-medium"
              >
                <Plus size={20} /> Add another item
              </button>

              <div className="border-t pt-4 space-y-3">
                <div className="text-right text-gray-600">
                  Subtotal: ${calculateSubtotal().toFixed(2)}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                      className="input-field text-gray-900"
                      step="0.01"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      className="input-field text-gray-900"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="text-right text-gray-600">
                  <span className="font-bold text-gray-900"> Total: ${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 'participants' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Organizer details</h2>
                <p className="text-gray-600">Set up organizer access before inviting friends.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-900 mb-2">Organizer phone</h3>
                <p className="text-gray-600 text-sm mb-3">
                  Needed for SMS recovery if you lose your organizer link (your private dashboard link).
                </p>
                <input
                  type="tel"
                  placeholder="Your phone number"
                  value={organizerPhone}
                  onChange={(e) => setOrganizerPhone(formatUSPhone(e.target.value))}
                  inputMode="numeric"
                  pattern="\\d{3}-\\d{3}-\\d{4}"
                  maxLength={12}
                  className="input-field text-gray-900"
                />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Add Friends</h3>
                <p className="text-gray-600 mb-3">Who's splitting this bill?</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex-1">Enter each person's name</div>
                  <div className="flex items-center gap-1.5">
                    <Plus size={14} />
                    <span className="font-medium">Add +1 guests</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {participants.map((participant, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <div className="flex-1">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Name"
                          value={participant.name}
                          onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                          className="input-field text-gray-900"
                        />
                        {participant.plusOneCount > 0 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/30">
                            +{participant.plusOneCount}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 p-1">
                      <button
                        type="button"
                        onClick={() => decrementPlusOne(index)}
                        disabled={participant.plusOneCount === 0}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Remove +1"
                      >
                        <span className="text-lg leading-none">−</span>
                      </button>
                      <div className="w-8 text-center text-sm font-bold text-gray-700">
                        {participant.plusOneCount}
                      </div>
                      <button
                        type="button"
                        onClick={() => incrementPlusOne(index)}
                        className="w-7 h-7 flex items-center justify-center text-white bg-gradient-to-r from-primary to-primary-dark rounded hover:shadow-md transition-all"
                        title="Add +1"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {participants.length > 1 && (
                      <button
                        onClick={() => removeParticipant(index)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addParticipant}
                className="flex items-center gap-2 text-primary font-medium"
              >
                <Plus size={20} /> Add another person
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Bill</h2>
                <p className="text-gray-600">Make sure everything looks right</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Receipt size={20} /> Items ({items.filter(i => i.name).length})
                  </h3>
                  <div className="space-y-2">
                    {items.filter(i => i.name).map((item, i) => (
                      <div key={i} className="flex justify-between text-gray-700">
                        <span>{item.name} {item.quantity > 1 && `x${item.quantity}`}</span>
                        <span>${(parseFloat(item.price) || 0).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>${calculateSubtotal().toFixed(2)}</span>
                      </div>
                      {parseFloat(taxAmount) > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Tax</span>
                          <span>${parseFloat(taxAmount).toFixed(2)}</span>
                        </div>
                      )}
                      {parseFloat(tipAmount) > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Tip</span>
                          <span>${parseFloat(tipAmount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-gray-900 text-lg mt-2">
                        <span>Total</span>
                        <span>${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Users size={20} /> Participants ({participants.filter(p => p.name).reduce((sum, p) => sum + 1 + p.plusOneCount, 0)})
                  </h3>
                  <div className="space-y-2">
                    {participants.filter(p => p.name).map((p, i) => (
                      <div key={i} className="flex justify-between text-gray-700">
                        <span>
                          {p.name}
                          {p.plusOneCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/30">
                              +{p.plusOneCount}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {currentStepIndex > 0 && (
            <button
              onClick={handleBack}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={20} /> Back
            </button>
          )}

          {step === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Creating...
                </>
              ) : (
                <>
                  Create Bill <Check size={20} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Next <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableItemRow({
  item,
  index,
  onChange,
  onRemove,
  showRemove
}: {
  item: ItemInput
  index: number
  onChange: (index: number, field: keyof ItemInput, value: string | number) => void
  onRemove: (index: number) => void
  showRemove: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  }

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 items-center">
      <button
        type="button"
        className="w-6 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>
      <div className="flex-1">
        <input
          type="text"
          placeholder="Item name"
          value={item.name}
          onChange={(e) => onChange(index, 'name', e.target.value)}
          className="input-field text-gray-900"
        />
      </div>
      <div className="w-24">
        <input
          type="number"
          placeholder="Total"
          value={item.price}
          onChange={(e) => onChange(index, 'price', e.target.value)}
          className="input-field text-gray-900 text-right"
          step="1"
        />
      </div>
      <div className="w-16">
        <input
          type="number"
          placeholder="Qty"
          value={item.quantity}
          onChange={(e) => onChange(index, 'quantity', parseInt(e.target.value) || 1)}
          className="input-field text-gray-900 text-center"
          min="1"
        />
      </div>
      {showRemove ? (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 size={20} />
        </button>
      ) : (
        <div className="w-10" aria-hidden="true" />
      )}
    </div>
  )
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function resizeImageToBase64(
  file: File,
  maxDimension = 1600,
  quality = 0.72
): Promise<string> {
  const dataUrl = await fileToBase64(file)
  const image = new Image()

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const { width, height } = image
      const scale = Math.min(1, maxDimension / Math.max(width, height))
      const targetWidth = Math.round(width * scale)
      const targetHeight = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Canvas not supported'))
        return
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight)
      const resized = canvas.toDataURL('image/jpeg', quality)
      resolve(resized)
    }
    image.onerror = reject
    image.src = dataUrl
  })
}
