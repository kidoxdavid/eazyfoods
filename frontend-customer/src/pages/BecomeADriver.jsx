import { Link } from 'react-router-dom'
import { Truck, DollarSign, Clock, Zap, MapPin, FileCheck, ArrowRight, CheckCircle } from 'lucide-react'
import PageBanner from '../components/PageBanner'

const BecomeADriver = () => {
  const benefits = [
    {
      icon: DollarSign,
      title: 'Flexible Earnings',
      description: 'Earn on every delivery. Get paid for the work you do, when you do it.'
    },
    {
      icon: Clock,
      title: 'Work Your Hours',
      description: 'Choose your own schedule. Drive mornings, evenings, or weekends—it’s up to you.'
    },
    {
      icon: Zap,
      title: 'Quick Signup',
      description: 'Simple application and fast approval. Get started and accept orders in no time.'
    }
  ]

  const steps = [
    { number: 1, title: 'Apply online', detail: 'Fill out a short application with your details and vehicle information.' },
    { number: 2, title: 'Get approved', detail: 'We’ll review your application and get in touch within a few business days.' },
    { number: 3, title: 'Start delivering', detail: 'Complete a quick onboarding, then start accepting delivery requests.' }
  ]

  const requirements = [
    'Valid driver’s licence',
    'Vehicle (car, bike, or scooter depending on your area)',
    'Smartphone with our driver app',
    'Ability to lift and carry grocery bags'
  ]

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top banner: same height (240px) as other pages, with optional ad */}
      <PageBanner
        title="Become a Delivery Driver"
        subtitle="Join the eazyfoods driver network. Flexible hours, competitive pay, simple signup."
        placement="become_a_driver_top_banner"
        variant="primary"
        defaultContent={
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center flex-shrink-0">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Become a Delivery Driver</h1>
            </div>
            <p className="text-white/95 text-sm sm:text-base max-w-2xl mx-auto mb-4">
              Join the eazyfoods driver network. Flexible hours, competitive pay, simple signup.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-sm px-3 sm:px-4 py-1.5 rounded-full border border-white/30">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">Flexible Earnings</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-sm px-3 sm:px-4 py-1.5 rounded-full border border-white/30">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">Work Your Hours</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-sm px-3 sm:px-4 py-1.5 rounded-full border border-white/30">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">Quick Signup</span>
              </div>
            </div>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Intro */}
        <section className="text-center mb-12">
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Deliver authentic African groceries and meals to customers in your area. We handle the orders and the app—you bring the wheels and the hustle.
          </p>
        </section>

        {/* Benefits */}
        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Why drive with us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {benefits.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">How it works</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {steps.map((step) => (
                <li key={step.number} className="flex gap-3 p-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-lg">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">What you need</h2>
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
            <ul className="space-y-3">
              {requirements.map((req) => (
                <li key={req} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Delivery areas hint */}
        <section className="mb-6 rounded-xl bg-orange-50/50 border border-orange-200 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-6 w-6 text-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Delivery areas</h3>
              <p className="text-sm text-gray-600">
                We deliver across Calgary, Edmonton, Red Deer, and surrounding areas. When you apply, you’ll choose your preferred zone. More cities coming soon.
              </p>
            </div>
          </div>
        </section>

        {/* CTA - redesigned */}
        <section className="mt-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-orange-700 shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-80" aria-hidden="true" />
            <div className="relative px-6 py-10 sm:px-10 sm:py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Ready to start?</h3>
                <p className="text-white/90 text-sm sm:text-base max-w-md">
                  Complete the driver application in a few minutes. Join the network and start earning on your schedule.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link
                  to="/driver-signup"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-primary-600 font-semibold rounded-xl hover:bg-nude-50 transition-colors shadow-lg hover:shadow-xl"
                >
                  <FileCheck className="h-5 w-5" />
                  Apply to drive
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Questions? Visit our <Link to="/contact" className="text-primary-600 hover:underline">Contact</Link> page or email support@eazyfoods.com.
        </p>
      </div>
    </div>
  )
}

export default BecomeADriver
