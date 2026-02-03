export function calculateSplits(
  items: any[],
  participants: any[],
  claims: any[],
  taxAmount: number,
  tipAmount: number
): Record<string, number> {
  const splits: Record<string, number> = {}
  
  // Initialize all participants to 0
  participants.forEach(p => {
    splits[p.id] = 0
  })

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = Number(item.price)
    return sum + itemPrice
  }, 0)
  const extrasTotal = (Number(taxAmount) || 0) + (Number(tipAmount) || 0)
  const multiplier = subtotal > 0 ? 1 + (extrasTotal / subtotal) : 1

  // Process each claim
  claims.forEach(claim => {
    const item = items.find(i => i.id === claim.item_id)
    if (!item) return

    const itemPrice = Number(item.price)
    const itemWithExtras = itemPrice * multiplier

    if (claim.share_type === 'solo') {
      // One person gets the full item
      const claimQuantity = claim.quantity_claimed ?? 1
      const itemQuantity = item.quantity || 1
      splits[claim.participant_id] += itemWithExtras * (claimQuantity / itemQuantity)
    } else if (claim.share_type === 'split_with_all') {
      // Split among all participants
      const perPerson = itemWithExtras / participants.length
      participants.forEach(p => {
        splits[p.id] += perPerson
      })
    } else if (claim.share_type === 'split_with_specific') {
      // Split among specific people
      const shareWith = claim.share_with_participant_ids || []
      const totalSharers = shareWith.length + 1 // Include claimer
      const perPerson = itemWithExtras / totalSharers
      
      splits[claim.participant_id] += perPerson
      shareWith.forEach((pid: string) => {
        splits[pid] += perPerson
      })
    }
  })

  // Round to 2 decimal places
  Object.keys(splits).forEach(key => {
    splits[key] = Math.round(splits[key] * 100) / 100
  })

  return splits
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getUnclaimedItems(items: any[], claims: any[]): any[] {
  return items.filter(item => {
    return !claims.some(claim => claim.item_id === item.id)
  })
}

export function getItemClaimers(itemId: string, claims: any[], participants: any[]): any[] {
  return claims
    .filter(c => c.item_id === itemId)
    .map(c => participants.find(p => p.id === c.participant_id))
    .filter(Boolean)
}

export function getItemizedShares(
  items: any[],
  participants: any[],
  claims: any[]
): Record<string, { items: Array<{ item_id: string; name: string; amount: number }>; subtotal: number }> {
  const result: Record<string, { items: Array<{ item_id: string; name: string; amount: number }>; subtotal: number }> = {}

  participants.forEach((participant) => {
    result[participant.id] = { items: [], subtotal: 0 }
  })

  const addShare = (participantId: string, itemId: string, name: string, amount: number) => {
    if (!result[participantId]) return
    result[participantId].items.push({ item_id: itemId, name, amount })
    result[participantId].subtotal += amount
  }

  claims.forEach((claim) => {
    const item = items.find((candidate) => candidate.id === claim.item_id)
    if (!item) return

    const itemPrice = parseFloat(item.price)
    if (!Number.isFinite(itemPrice)) return

    if (claim.share_type === 'solo') {
      const claimQuantity = claim.quantity_claimed ?? 1
      const itemQuantity = item.quantity || 1
      const amount = itemPrice * (claimQuantity / itemQuantity)
      addShare(claim.participant_id, item.id, item.name, amount)
    } else if (claim.share_type === 'split_with_all') {
      const perPerson = itemPrice / participants.length
      participants.forEach((participant) => {
        addShare(participant.id, item.id, item.name, perPerson)
      })
    } else if (claim.share_type === 'split_with_specific') {
      const shareWith = claim.share_with_participant_ids || []
      const totalSharers = shareWith.length + 1
      const perPerson = itemPrice / totalSharers

      addShare(claim.participant_id, item.id, item.name, perPerson)
      shareWith.forEach((pid: string) => {
        addShare(pid, item.id, item.name, perPerson)
      })
    }
  })

  Object.keys(result).forEach((key) => {
    result[key].subtotal = Math.round(result[key].subtotal * 100) / 100
  })

  return result
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
