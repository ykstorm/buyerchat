"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Calendar, Clock, User, Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"

interface VisitBookingModalProps {
  projectId: string
  projectName: string
  builderName: string
  isOpen: boolean
  onClose: () => void
}

interface BookingData {
  date: Date | null
  timeSlot: string | null
  name: string
  phone: string
  email: string
  notes: string
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const modalVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const}
  },
  exit: {
    opacity: 0, y: 24, scale: 0.97,
    transition: { duration: 0.3 }
  },
}

const stepVariants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const }
  },
  exit: {
    opacity: 0, x: -24,
    transition: { duration: 0.25 }
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const }
  },
}

const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }
function formatDate(d: Date) { return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}` }
function isPastDate(day: number, month: number, year: number) {
  const today = new Date(); today.setHours(0,0,0,0)
  return new Date(year, month, day) < today
}

// ── Confetti particle
function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ["#3de8a0", "#60a5fa", "#f59e0b", "#f472b6", "#a78bfa"]
  const color = colors[Math.floor(Math.random() * colors.length)]
  const x = (Math.random() - 0.5) * 300
  const rotate = Math.random() * 720 - 360
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 w-2 h-2 rounded-sm pointer-events-none"
      style={{ background: color }}
      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      animate={{ opacity: 0, x, y: -150 - Math.random() * 100, rotate, scale: 0 }}
      transition={{ duration: 1.2 + Math.random() * 0.5, delay, ease: "easeOut" }}
    />
  )
}

function Confetti({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {Array.from({ length: 24 }).map((_, i) => (
        <ConfettiParticle key={i} delay={i * 0.03} />
      ))}
    </div>
  )
}

// ── Shimmer button
function ShimmerButton({
  children, onClick, disabled, className
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {!disabled && (
        <motion.span
          className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20"
          animate={{ translateX: ["−100%", "200%"] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
        />
      )}
      <span className="relative">{children}</span>
    </motion.button>
  )
}

export function VisitBookingModal({ projectId, projectName, builderName, isOpen, onClose }: VisitBookingModalProps) {
  const [step, setStep] = React.useState(1)
  const [bookingData, setBookingData] = React.useState<BookingData>({
    date: null, timeSlot: null, name: "", phone: "", email: "", notes: ""
  })
  const [currentMonth, setCurrentMonth] = React.useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear())
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showConfetti, setShowConfetti] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [hoveredDay, setHoveredDay] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1)
        setBookingData({ date: null, timeSlot: null, name: "", phone: "", email: "", notes: "" })
        setCurrentMonth(new Date().getMonth())
        setCurrentYear(new Date().getFullYear())
        setIsSubmitting(false)
        setShowConfetti(false)
        setError(null)
      }, 300)
    }
  }, [isOpen])

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const handleDateSelect = (day: number) => {
    if (isPastDate(day, currentMonth, currentYear)) return
    setBookingData(prev => ({ ...prev, date: new Date(currentYear, currentMonth, day) }))
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(p => p - 1) }
    else setCurrentMonth(p => p - 1)
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(p => p + 1) }
    else setCurrentMonth(p => p + 1)
  }

  const canProceedStep1 = bookingData.date !== null && bookingData.timeSlot !== null
  const canProceedStep2 = bookingData.name.trim() !== "" && bookingData.phone.trim().length >= 10

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const scheduledDate = new Date(
        bookingData.date!.getFullYear(),
        bookingData.date!.getMonth(),
        bookingData.date!.getDate(),
        parseInt(bookingData.timeSlot!.split(":")[0]) + (bookingData.timeSlot!.includes("PM") && !bookingData.timeSlot!.startsWith("12") ? 12 : 0)
      )
      const res = await fetch("/api/visit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, visitScheduledDate: scheduledDate.toISOString() })
      })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 401) { setError("Please sign in to book a site visit."); setIsSubmitting(false); return }
        if (res.status === 409) { setError("You already have a pending visit for this project."); setIsSubmitting(false); return }
        throw new Error(data.error || "Booking failed")
      }
      setShowConfetti(true)
      setStep(3)
      setTimeout(() => setShowConfetti(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth)
  const today = new Date()
  const isPrevMonthDisabled = currentYear === today.getFullYear() && currentMonth === today.getMonth()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial="hidden" animate="visible" exit="exit"
        >
          <motion.div
            className="absolute inset-0 z-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            variants={overlayVariants}
            onClick={onClose}
          />

          <motion.div
className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            variants={modalVariants}
            onClick={e => e.stopPropagation()}
          >
            <Confetti active={showConfetti} />

            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-[#3de8a0] to-[#60a5fa]"
                animate={{ width: step === 1 ? "33.33%" : step === 2 ? "66.66%" : "100%" }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-0">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#3de8a0] mb-1">Book Site Visit</p>
                <h2 className="font-serif text-2xl text-[#e0e0ea]">{projectName}</h2>
                <p className="text-sm text-[#636380] mt-0.5">by {builderName}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                <X className="w-5 h-5 text-[#636380]" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-3 px-6 py-4">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <motion.div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      step === s ? "bg-[#3de8a0] text-[#09090b]"
                      : step > s ? "bg-[#3de8a0]/20 text-[#3de8a0]"
                      : "bg-white/5 text-[#636380]"
                    }`}
                    animate={step === s ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </motion.div>
                  <span className={`text-xs hidden sm:block ${step === s ? "text-[#e0e0ea]" : "text-[#636380]"}`}>
                    {s === 1 ? "Schedule" : s === 2 ? "Details" : "Done"}
                  </span>
                  {s < 3 && <div className={`w-8 h-px ${step > s ? "bg-[#3de8a0]/40" : "bg-white/10"}`} />}
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="px-6 pb-2 overflow-y-auto flex-1">
              <AnimatePresence mode="wait">

                {/* STEP 1 — Schedule */}
                {step === 1 && (
                  <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                    <motion.div className="flex items-center gap-2 mb-4" variants={fadeUp} initial="hidden" animate="visible">
                      <Calendar className="w-4 h-4 text-[#3de8a0]" />
                      <span className="text-sm font-medium text-[#e0e0ea]">Select Date</span>
                    </motion.div>

                    <motion.div className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-4 mb-5" variants={fadeUp} initial="hidden" animate="visible">
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={handlePrevMonth} disabled={isPrevMonthDisabled}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <ChevronLeft className="w-4 h-4 text-[#e0e0ea]" />
                        </button>
                        <span className="text-sm font-medium text-[#e0e0ea]">{MONTHS[currentMonth]} {currentYear}</span>
                        <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                          <ChevronRight className="w-4 h-4 text-[#e0e0ea]" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(d => <div key={d} className="text-center text-[10px] uppercase tracking-wider text-[#636380] py-1">{d}</div>)}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                          if (day === null) return <div key={`e${idx}`} className="aspect-square" />
                          const isPast = isPastDate(day, currentMonth, currentYear)
                          const isTodayDate = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear
                          const isSelected = bookingData.date?.getDate() === day && bookingData.date?.getMonth() === currentMonth && bookingData.date?.getFullYear() === currentYear
                          const isHovered = hoveredDay === day && !isPast && !isSelected
                          return (
                            <motion.button
                              key={day}
                              onClick={() => handleDateSelect(day)}
                              onMouseEnter={() => setHoveredDay(day)}
                              onMouseLeave={() => setHoveredDay(null)}
                              disabled={isPast}
                              className={`aspect-square rounded-lg text-sm font-medium transition-all relative ${
                                isPast ? "text-[#454560] cursor-not-allowed"
                                : isSelected ? "bg-[#3de8a0] text-[#09090b] shadow-[0_0_12px_rgba(61,232,160,0.3)]"
                                : isTodayDate ? "bg-white/10 text-[#e0e0ea]"
                                : "text-[#e0e0ea]"
                              }`}
                              animate={isSelected ? { scale: [1, 1.1, 1] } : isHovered ? { scale: 1.08 } : { scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              {day}
                              {isTodayDate && !isSelected && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#3de8a0]" />
                              )}
                            </motion.button>
                          )
                        })}
                      </div>
                    </motion.div>

                    <motion.div variants={fadeUp} initial="hidden" animate="visible">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-[#3de8a0]" />
                        <span className="text-sm font-medium text-[#e0e0ea]">Select Time</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {TIME_SLOTS.map(time => {
                          const isSelected = bookingData.timeSlot === time
                          return (
                            <motion.button
                              key={time}
                              onClick={() => setBookingData(p => ({ ...p, timeSlot: time }))}
                              className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-all border ${
                                isSelected
                                  ? "bg-[#3de8a0]/15 border-[#3de8a0] text-[#3de8a0] shadow-[0_0_8px_rgba(61,232,160,0.2)]"
                                  : "bg-white/[0.03] border-white/[0.08] text-[#8888a8] hover:border-white/15 hover:text-[#e0e0ea]"
                              }`}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              {time}
                            </motion.button>
                          )
                        })}
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {bookingData.date && bookingData.timeSlot && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                          className="mt-5 p-3 rounded-xl bg-[#3de8a0]/10 border border-[#3de8a0]/20 flex items-center gap-2"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#3de8a0] flex-shrink-0" />
                          <p className="text-xs text-[#3de8a0]">
                            {formatDate(bookingData.date)} at {bookingData.timeSlot}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* STEP 2 — Details */}
                {step === 2 && (
                  <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                    <motion.div className="flex items-center gap-2 mb-5" variants={fadeUp} initial="hidden" animate="visible">
                      <User className="w-4 h-4 text-[#3de8a0]" />
                      <span className="text-sm font-medium text-[#e0e0ea]">Your Details</span>
                    </motion.div>

                    <div className="space-y-4">
                      {[
                        { field: "name", label: "Full Name", type: "text", placeholder: "Enter your full name", required: true },
                        { field: "email", label: "Email Address", type: "email", placeholder: "your@email.com", required: false },
                      ].map(({ field, label, type, placeholder, required }) => (
                        <motion.div key={field} variants={fadeUp} initial="hidden" animate="visible">
                          <label className="block text-xs text-[#636380] mb-2">
                            {label} {required && <span className="text-[#3de8a0]">*</span>}
                          </label>
                          <input
                            type={type}
                            value={bookingData[field as keyof BookingData] as string}
                            onChange={e => setBookingData(p => ({ ...p, [field]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#e0e0ea] placeholder-[#454560] text-sm focus:outline-none focus:border-[#3de8a0] transition-colors"
                          />
                        </motion.div>
                      ))}

                      {/* Phone with +91 prefix */}
                      <motion.div variants={fadeUp} initial="hidden" animate="visible">
                        <label className="block text-xs text-[#636380] mb-2">
                          Phone Number <span className="text-[#3de8a0]">*</span>
                        </label>
                        <div className="flex gap-2">
                          <div className="flex items-center px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#8888a8] text-sm font-mono flex-shrink-0">
                            +91
                          </div>
                          <input
                            type="tel"
                            value={bookingData.phone}
                            onChange={e => setBookingData(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                            placeholder="98765 43210"
                            maxLength={10}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#e0e0ea] placeholder-[#454560] text-sm focus:outline-none focus:border-[#3de8a0] transition-colors font-mono tracking-widest"
                          />
                        </div>
                        {bookingData.phone.length > 0 && bookingData.phone.length < 10 && (
                          <p className="text-[10px] text-amber-400 mt-1">Enter 10-digit mobile number</p>
                        )}
                      </motion.div>

                      <motion.div variants={fadeUp} initial="hidden" animate="visible">
                        <label className="block text-xs text-[#636380] mb-2">Notes for the visit</label>
                        <textarea
                          value={bookingData.notes}
                          onChange={e => setBookingData(p => ({ ...p, notes: e.target.value }))}
                          placeholder="Any specific requirements or questions?"
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#e0e0ea] placeholder-[#454560] text-sm focus:outline-none focus:border-[#3de8a0] transition-colors resize-none"
                        />
                      </motion.div>
                    </div>

                    {/* Visit summary */}
                    <motion.div
                      variants={fadeUp} initial="hidden" animate="visible"
                      className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#e0e0ea]">{bookingData.date ? formatDate(bookingData.date) : ""}</p>
                        <p className="text-xs text-[#636380]">{bookingData.timeSlot}</p>
                      </div>
                      <button onClick={() => setStep(1)} className="text-xs text-[#3de8a0] hover:underline">Change</button>
                    </motion.div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* STEP 3 — Success */}
                {step === 3 && (
                  <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                    className="flex flex-col items-center justify-center h-[400px] text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      className="relative w-20 h-20 rounded-full bg-[#3de8a0]/15 flex items-center justify-center mb-6"
                    >
                      <motion.div
                        className="absolute inset-0 rounded-full bg-[#3de8a0]/20"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
                        className="w-12 h-12 rounded-full bg-[#3de8a0] flex items-center justify-center relative z-10"
                      >
                        <Check className="w-6 h-6 text-[#09090b]" />
                      </motion.div>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="font-serif text-2xl text-[#e0e0ea] mb-2"
                    >
                      Visit Booked!
                    </motion.h3>

                    <motion.p
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-sm text-[#636380] mb-6 max-w-xs"
                    >
                      Your site visit request is confirmed. Check your email for the visit token.
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] w-full max-w-xs"
                    >
                      <p className="text-sm font-medium text-[#e0e0ea]">{projectName}</p>
                      <p className="text-xs text-[#636380] mt-1">
                        {bookingData.date ? formatDate(bookingData.date) : ""} at {bookingData.timeSlot}
                      </p>
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="text-xs text-[#454560] mt-4"
                    >
                      Confirmation sent to +91 {bookingData.phone}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {step !== 3 ? (
              <div className="p-6 pt-3 flex gap-3">
                {step === 2 && (
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-full border border-white/10 text-[#8888a8] text-sm font-medium hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                )}
                <ShimmerButton
                  onClick={() => {
                    if (step === 1 && canProceedStep1) setStep(2)
                    else if (step === 2 && canProceedStep2) handleSubmit()
                  }}
                  disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) || isSubmitting}
                  className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all ${
                    ((step === 1 && canProceedStep1) || (step === 2 && canProceedStep2)) && !isSubmitting
                      ? "bg-[#3de8a0] text-[#09090b]"
                      : "bg-white/10 text-[#454560] cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Booking...
                    </span>
                  ) : step === 1 ? "Continue →" : "Confirm Booking"}
                </ShimmerButton>
              </div>
            ) : (
              <div className="p-6 pt-3">
                <ShimmerButton
                  onClick={onClose}
                  className="w-full py-3 rounded-full bg-[#3de8a0] text-[#09090b] text-sm font-semibold"
                >
                  Done
                </ShimmerButton>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
