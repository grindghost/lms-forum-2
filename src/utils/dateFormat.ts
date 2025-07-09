// Internationalized date formatting utility
export function formatDate(date: Date | string | number, locale: string = 'fr'): string {
    const dateObj = new Date(date)
    
    // Month names for different languages
    const months = {
      fr: [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ],
      en: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
    }
    
    // Day names for different languages
    const days = {
      fr: [
        'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 
        'Jeudi', 'Vendredi', 'Samedi'
      ],
      en: [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday'
      ]
    }
    
    const dayName = days[locale as keyof typeof days]?.[dateObj.getDay()] || days.fr[dateObj.getDay()]
    const day = dateObj.getDate()
    const month = months[locale as keyof typeof months]?.[dateObj.getMonth()] || months.fr[dateObj.getMonth()]
    const year = dateObj.getFullYear()
    
    // Format time (12-hour format with am/pm)
    const hours = dateObj.getHours()
    const minutes = dateObj.getMinutes()
    const ampm = hours >= 12 ? 'pm' : 'am'
    const displayHours = hours % 12 || 12
    const displayMinutes = minutes.toString().padStart(2, '0')
    
    // Language-specific separators
    const separators = {
      fr: 'à',
      en: 'at'
    }
    
    const separator = separators[locale as keyof typeof separators] || separators.fr
    
    return `${dayName}, ${day} ${month} ${year} ${separator} ${displayHours}:${displayMinutes}${ampm}`
  }
  
  // Alternative: Short format for lists (e.g., "9 Juil 2025" or "9 Jul 2025")
  export function formatDateShort(date: Date | string | number, locale: string = 'fr'): string {
    const dateObj = new Date(date)
    
    const months = {
      fr: [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
        'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
      ],
      en: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ]
    }
    
    const day = dateObj.getDate()
    const month = months[locale as keyof typeof months]?.[dateObj.getMonth()] || months.fr[dateObj.getMonth()]
    const year = dateObj.getFullYear()
    
    return `${day} ${month} ${year}`
  }
  
  // Alternative: Relative time (e.g., "il y a 2 heures", "hier" or "2 hours ago", "yesterday")
  export function formatDateRelative(date: Date | string | number, locale: string = 'fr'): string {
    const dateObj = new Date(date)
    const now = new Date()
    const diffInMs = now.getTime() - dateObj.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    const translations = {
      fr: {
        justNow: 'à l\'instant',
        minutesAgo: (count: number) => `il y a ${count} minute${count > 1 ? 's' : ''}`,
        hoursAgo: (count: number) => `il y a ${count} heure${count > 1 ? 's' : ''}`,
        yesterday: 'hier',
        daysAgo: (count: number) => `il y a ${count} jour${count > 1 ? 's' : ''}`
      },
      en: {
        justNow: 'just now',
        minutesAgo: (count: number) => `${count} minute${count > 1 ? 's' : ''} ago`,
        hoursAgo: (count: number) => `${count} hour${count > 1 ? 's' : ''} ago`,
        yesterday: 'yesterday',
        daysAgo: (count: number) => `${count} day${count > 1 ? 's' : ''} ago`
      }
    }
    
    const t = translations[locale as keyof typeof translations] || translations.fr
    
    if (diffInMinutes < 1) return t.justNow
    if (diffInMinutes < 60) return t.minutesAgo(diffInMinutes)
    if (diffInHours < 24) return t.hoursAgo(diffInHours)
    if (diffInDays === 1) return t.yesterday
    if (diffInDays < 7) return t.daysAgo(diffInDays)
    
    return formatDateShort(dateObj, locale)
  }