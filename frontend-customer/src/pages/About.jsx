import { Heart, Globe, Award, Users, ShoppingBag, Leaf, Sparkles, TrendingUp } from 'lucide-react'
import PageBanner from '../components/PageBanner'

const About = () => {
  return (
    <div className="w-full">
      {/* Banner Header with Ad Support */}
      <PageBanner
        title="About eazyfoods"
        subtitle="Your trusted gateway to authentic African groceries, bringing the flavors of home right to your doorstep."
        placement="about_top_banner"
        defaultContent={
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <Heart className="h-8 w-8 sm:h-10 sm:w-10 mr-3 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                About eazyfoods
              </h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-white/95 max-w-2xl mx-auto mb-4 font-medium">
              Your trusted gateway to authentic African groceries, bringing the flavors of home right to your doorstep.
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Our Story</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Our Mission</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-300">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold">Our Values</span>
              </div>
            </div>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">

      {/* Mission Section */}
      <section className="mb-4">
        <div className="bg-gradient-to-r from-nude-50 to-nude-100 rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-center mb-3">
            <Heart className="h-6 w-6 text-nude-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-3">Our Mission</h2>
          <p className="text-sm text-gray-700 text-center leading-relaxed">
            At eazyfoods, we believe that food is more than just sustenance—it's a connection to culture, 
            family, and home. Our mission is to make authentic African groceries accessible to everyone, 
            regardless of where you are. We work directly with trusted vendors and suppliers across Africa 
            to bring you the freshest, highest-quality products that remind you of home.
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Our Values</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="bg-nude-100 rounded-full w-10 h-10 flex items-center justify-center mb-2 mx-auto">
              <Award className="h-5 w-5 text-nude-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 text-center">Quality First</h3>
            <p className="text-xs text-gray-600 text-center">
              We source only the finest products, ensuring every item meets our strict quality standards.
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="bg-nude-100 rounded-full w-10 h-10 flex items-center justify-center mb-2 mx-auto">
              <Globe className="h-5 w-5 text-nude-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 text-center">Authenticity</h3>
            <p className="text-xs text-gray-600 text-center">
              Every product is authentic and true to its origin. We celebrate the rich diversity of African cuisine.
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="bg-nude-100 rounded-full w-10 h-10 flex items-center justify-center mb-2 mx-auto">
              <Users className="h-5 w-5 text-nude-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 text-center">Community</h3>
            <p className="text-xs text-gray-600 text-center">
              We're more than a marketplace—we're a community supporting local vendors.
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="bg-nude-100 rounded-full w-10 h-10 flex items-center justify-center mb-2 mx-auto">
              <ShoppingBag className="h-5 w-5 text-nude-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 text-center">Convenience</h3>
            <p className="text-xs text-gray-600 text-center">
              Shop from home with fast, reliable delivery and easy pickup options.
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="bg-nude-100 rounded-full w-10 h-10 flex items-center justify-center mb-2 mx-auto">
              <Leaf className="h-5 w-5 text-nude-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 text-center">Sustainability</h3>
            <p className="text-xs text-gray-600 text-center">
              Committed to sustainable practices, supporting local farmers.
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="bg-nude-100 rounded-full w-10 h-10 flex items-center justify-center mb-2 mx-auto">
              <Heart className="h-5 w-5 text-nude-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 text-center">Customer Care</h3>
            <p className="text-xs text-gray-600 text-center">
              Your experience matters. Our dedicated support team is here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="mb-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Our Story</h2>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              eazyfoods was born from a simple idea: making authentic African groceries accessible to everyone, 
              everywhere. Founded by a team passionate about African cuisine and culture, we recognized the challenge 
              many people face when trying to find quality African ingredients in their local area.
            </p>
            <p>
              What started as a small initiative to connect communities with their favorite foods has grown into 
              a comprehensive platform that serves thousands of customers across multiple cities. We partner with 
              trusted vendors who share our commitment to quality and authenticity, creating a network that spans 
              the entire African continent.
            </p>
            <p>
              Today, eazyfoods is more than just an online grocery store. We're a bridge between cultures, 
              a support system for local businesses, and a trusted partner for families who want to bring the 
              flavors of home to their table. Whether you're looking for West African jollof rice ingredients, 
              East African spices, or South African specialties, we're here to make it easy.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Why Choose eazyfoods?</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-nude-50 to-white rounded-lg p-3 border border-nude-200">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Wide Selection</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              Browse thousands of authentic products from across Africa. From fresh produce to pantry staples, 
              spices to specialty items.
            </p>
          </div>

          <div className="bg-gradient-to-br from-nude-50 to-white rounded-lg p-3 border border-nude-200">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Trusted Vendors</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              All our vendors are carefully vetted and verified. We work only with suppliers who meet our 
              quality standards.
            </p>
          </div>

          <div className="bg-gradient-to-br from-nude-50 to-white rounded-lg p-3 border border-nude-200">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Fast Delivery</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              Get your groceries delivered quickly and safely. We offer flexible delivery options and convenient 
              pickup locations.
            </p>
          </div>

          <div className="bg-gradient-to-br from-nude-50 to-white rounded-lg p-3 border border-nude-200">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Best Prices</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              We believe quality shouldn't break the bank. Our competitive pricing and regular promotions 
              ensure you get the best value.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center">
        <div className="bg-nude-600 rounded-lg p-4 text-white shadow-sm">
          <h2 className="text-xl font-bold mb-2">Ready to Start Shopping?</h2>
          <p className="text-sm mb-4 text-white/90">
            Join thousands of satisfied customers and discover the authentic flavors of Africa.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/groceries"
              className="bg-white text-nude-600 px-4 py-2 rounded-lg font-semibold hover:bg-nude-50 transition-colors text-sm"
            >
              Browse Groceries
            </a>
            <a
              href="/stores"
              className="bg-nude-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-nude-700 transition-colors text-sm border border-white/20"
            >
              Find Stores
            </a>
          </div>
        </div>
      </section>
      </div>
    </div>
  )
}

export default About

