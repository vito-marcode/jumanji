import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'it'

type Dict = Record<string, string>

// Client-facing strings. Keys are flat, dot-namespaced by area.
const en: Dict = {
  'common.help': 'Help',
  'common.leave': 'Leave',
  'common.language': 'Language',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.create': 'Create',
  'common.creating': 'Creating…',
  'common.save': 'Save',
  'common.add': 'Add',
  'common.editBtn': '✎ Edit',
  'common.doneBtn': '✓ Done',
  'common.newBtn': '+ New',
  'common.selectAll': 'Select all',
  'common.deselectAll': 'Deselect all',

  'header.session': 'Session:',
  'toast.sent': '✓ Sent to the Main Screen',

  'client.back': 'Back to collections',
  'client.activeCollection': 'Active Collection',
  'footer.clear': 'Clear main screen',

  'list.title': 'Your Collections',
  'list.helperEdit': 'Edit mode: add or remove collections and their messages.',
  'list.helperNormal': 'Tap a collection to open it, then pick a message to send.',
  'list.empty': 'No collections yet. Create one to begin.',

  'modalNew.title': 'New Collection',
  'modalNew.nameLabel': 'Collection Name',
  'modalNew.namePlaceholder': 'e.g. Dangers, Fate Cards, Items…',

  'card.messagesOne': '{n} message',
  'card.messagesOther': '{n} messages',
  'card.editMessage': 'Edit message',
  'card.deleteMessage': 'Delete message',
  'card.messagePlaceholder': 'Enter message text...',
  'card.addMessage': '+ Add Message',
  'card.deleteCollectionTitle': 'Delete collection?',
  'card.deleteCollectionMsg': '"{name}" and all its messages will be permanently removed.',
  'card.deleteMessageTitle': 'Delete message?',
  'card.deleteMessageMsg': '"{text}" will be permanently removed.',

  'panel.manual': 'Manual',
  'panel.random': 'Random',
  'panel.helperManual': 'Tap a message to send it to the main screen.',
  'panel.helperRandom': 'Select messages below, then slide to roll — a random pick will appear on the main screen.',
  'panel.emptyManual': 'No messages yet. Add some above.',
  'panel.emptyRandom': 'No messages yet.',
  'panel.selected': '{n}/{m} selected',
  'panel.slideSend': 'Slide to send →',
  'panel.slideRoll': '🎲 Slide to roll & send →',
  'panel.dragEnd': 'Drag to the end',
  'panel.sheetTitle': 'Send this message',
  'panel.revealSuspense': 'appearing on main screen…',
  'panel.revealDone': '✓ sent to main screen',

  'tut.s1.title': 'Collections',
  'tut.s1.desc': 'A collection is a category of things you might show — daily activities, services, prompts, anything. Tap one to open it.',
  'tut.s2.title': 'Messages',
  'tut.s2.desc': 'Each collection holds messages: the lines you can put on the main screen. Open a collection to see its list.',
  'tut.s3.title': 'Send a Message',
  'tut.s3.desc': 'Tap a message to open it, then slide to confirm — it appears on the main screen right away.',
  'tut.s4.title': 'Or Draw at Random',
  'tut.s4.desc': 'Switch to Random, choose which messages are in play, then slide to roll — one is drawn and sent with a flourish.',
  'tut.s5.title': 'Build Your Session',
  'tut.s5.desc': 'Tap Edit to set things up: add or remove collections, and add, edit, or delete the messages inside them.',

  'tut.skip': 'Skip',
  'tut.next': 'Next →',
  'tut.finish': 'Finish',
}

const it: Dict = {
  'common.help': 'Aiuto',
  'common.leave': 'Esci',
  'common.language': 'Lingua',
  'common.cancel': 'Annulla',
  'common.delete': 'Elimina',
  'common.create': 'Crea',
  'common.creating': 'Creazione…',
  'common.save': 'Salva',
  'common.add': 'Aggiungi',
  'common.editBtn': '✎ Modifica',
  'common.doneBtn': '✓ Fatto',
  'common.newBtn': '+ Nuova',
  'common.selectAll': 'Seleziona tutti',
  'common.deselectAll': 'Deseleziona tutti',

  'header.session': 'Sessione:',
  'toast.sent': '✓ Inviato allo schermo principale',

  'client.back': 'Torna alle collezioni',
  'client.activeCollection': 'Collezione attiva',
  'footer.clear': 'Pulisci schermo principale',

  'list.title': 'Le tue collezioni',
  'list.helperEdit': 'Modalità modifica: aggiungi o rimuovi collezioni e i loro messaggi.',
  'list.helperNormal': 'Tocca una collezione per aprirla, poi scegli un messaggio da inviare.',
  'list.empty': 'Nessuna collezione. Creane una per iniziare.',

  'modalNew.title': 'Nuova collezione',
  'modalNew.nameLabel': 'Nome collezione',
  'modalNew.namePlaceholder': 'es. Pericoli, Carte del Fato, Oggetti…',

  'card.messagesOne': '{n} messaggio',
  'card.messagesOther': '{n} messaggi',
  'card.editMessage': 'Modifica messaggio',
  'card.deleteMessage': 'Elimina messaggio',
  'card.messagePlaceholder': 'Scrivi il testo del messaggio...',
  'card.addMessage': '+ Aggiungi messaggio',
  'card.deleteCollectionTitle': 'Eliminare la collezione?',
  'card.deleteCollectionMsg': '«{name}» e tutti i suoi messaggi verranno eliminati definitivamente.',
  'card.deleteMessageTitle': 'Eliminare il messaggio?',
  'card.deleteMessageMsg': '«{text}» verrà eliminato definitivamente.',

  'panel.manual': 'Manuale',
  'panel.random': 'Casuale',
  'panel.helperManual': 'Tocca un messaggio per inviarlo allo schermo principale.',
  'panel.helperRandom': 'Seleziona i messaggi qui sotto, poi scorri per estrarre — un messaggio casuale apparirà sullo schermo principale.',
  'panel.emptyManual': 'Nessun messaggio. Aggiungine qualcuno sopra.',
  'panel.emptyRandom': 'Nessun messaggio.',
  'panel.selected': '{n}/{m} selezionati',
  'panel.slideSend': 'Scorri per inviare →',
  'panel.slideRoll': '🎲 Scorri per estrarre e inviare →',
  'panel.dragEnd': 'Trascina fino in fondo',
  'panel.sheetTitle': 'Invia questo messaggio',
  'panel.revealSuspense': 'in arrivo sullo schermo principale…',
  'panel.revealDone': '✓ inviato allo schermo principale',

  'tut.s1.title': 'Collezioni',
  'tut.s1.desc': 'Una collezione è una categoria di cose da mostrare — attività giornaliere, servizi, prompt, qualsiasi cosa. Toccane una per aprirla.',
  'tut.s2.title': 'Messaggi',
  'tut.s2.desc': 'Ogni collezione contiene messaggi: le frasi che puoi mostrare sullo schermo principale. Apri una collezione per vederne l’elenco.',
  'tut.s3.title': 'Invia un messaggio',
  'tut.s3.desc': 'Tocca un messaggio per aprirlo, poi scorri per confermare — appare subito sullo schermo principale.',
  'tut.s4.title': 'Oppure estrai a caso',
  'tut.s4.desc': 'Passa a Casuale, scegli quali messaggi sono in gioco, poi scorri per estrarre — ne viene pescato uno e inviato con un po’ di suspense.',
  'tut.s5.title': 'Prepara la sessione',
  'tut.s5.desc': 'Tocca Modifica per organizzare tutto: aggiungi o rimuovi collezioni, e aggiungi, modifica o elimina i messaggi al loro interno.',

  'tut.skip': 'Salta',
  'tut.next': 'Avanti →',
  'tut.finish': 'Fine',
}

const dictionaries: Record<Lang, Dict> = { en, it }

const STORAGE_KEY = 'jumanji.lang'

function detectLang(): Lang {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'it') return saved
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('it')) {
      return 'it'
    }
  }
  return 'en'
}

export type TFunction = (key: string, params?: Record<string, string | number>) => string

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TFunction
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const t = useCallback<TFunction>(
    (key, params) => {
      let s = dictionaries[lang][key] ?? dictionaries.en[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          s = s.split(`{${k}}`).join(String(v))
        }
      }
      return s
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}
