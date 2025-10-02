import { faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons"
import { faX } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { OptimizedImage } from "../seo/optimized-image"
import basicLessonsData from "@/data/basic-lessons.json";
import catCoin from "@/assets/images/icon.svg";
import { Link } from "@tanstack/react-router";

export const Footer = () => {
    return (
       <footer className="border-border bg-card relative z-10 border-t px-4 py-12 sm:px-6 sm:py-14 md:py-16 lg:px-8">
       <div className="mx-auto max-w-7xl">
         <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 md:gap-12 lg:grid-cols-4">
           {/* Brand */}
           <div className="space-y-3 sm:space-y-4">

             <div className="flex items-center">
           <div className="dark:bg-primary/90 rounded-xl dark:size-10 flex justify-center items-center">
               <OptimizedImage
                 src={catCoin}
                 alt="Moneko Logo"
                 className="h-6 w-6 sm:h-8 sm:w-8"
                 width={32}
                 height={32}
                 loading="lazy"
                 decoding="async"
               />
               </div>
               <span className="text-card-foreground ml-2 text-lg font-bold sm:text-xl">
                 Moneko
               </span>
             </div>
             <p className="text-muted-foreground max-w-xs text-sm leading-relaxed sm:text-base">
               <strong>Moneko</strong> - Your trusted AI personal finance coach
               for smart budgeting, goal tracking, investing education, and
               building lasting wealth.
             </p>
           </div>

           {/* Quick Links */}
           <div>
             <h3 className="text-card-foreground mb-4 text-xs font-semibold tracking-wider uppercase sm:mb-6 sm:text-sm">
               Quick Links
             </h3>
             <ul className="space-y-2 sm:space-y-3">
               <li>
                 <Link
                   to="/dashboard/learning"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   AI Financial Education
                 </Link>
               </li>
               <li>
                 <Link
                   to="/dashboard/learning"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   Financial Planning Courses
                 </Link>
               </li>
               <li>
                 <Link
                   to="/calculators"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   Budgeting & Investment Calculators
                 </Link>
               </li>
               <li>
                 <Link
                   to="/dashboard"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   AI Finance Coach Chat
                 </Link>
               </li>
               <li>
                 <Link
                   to="/team"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   Meet the Team
                 </Link>
               </li>
             </ul>
           </div>

           {/* Legal */}
           <div>
             <h3 className="text-card-foreground mb-4 text-xs font-semibold tracking-wider uppercase sm:mb-6 sm:text-sm">
               Legal
             </h3>
             <ul className="space-y-2 sm:space-y-3">
               <li>
                 <Link
                   to="/privacy-policy"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   Privacy Policy
                 </Link>
               </li>
               <li>
                 <Link
                   to="/terms-of-service"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   Terms of Service
                 </Link>
               </li>
               <li>
                 <Link
                   to="/cookie-policy"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   Cookie Policy
                 </Link>
               </li>
             </ul>
           </div>

           {/* Connect */}
           <div>
             <h3 className="text-card-foreground mb-4 text-xs font-semibold tracking-wider uppercase sm:mb-6 sm:text-sm">
               Connect
             </h3>
             <ul className="space-y-2 sm:space-y-3">
               <li>
                 <a
                   href="https://www.facebook.com/monekoai/"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   Facebook
                 </a>
               </li>
               <li>
                 <a
                   href="https://www.instagram.com/moneko_ai"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   Instagram
                 </a>
               </li>
               <li>
                 <a
                   href="https://x.com/moneko_ai"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   X
                 </a>
               </li>
               <li>
                 <a
                   href="mailto:hello@moneko.io"
                   className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                 >
                   Contact Us
                 </a>
               </li>
             </ul>
           </div>
         </div>

         {/* Bottom Section */}
         <div className="border-border mt-12 flex flex-col border-t pt-6 sm:mt-14 sm:pt-8 md:mt-16 md:flex-row md:items-center md:justify-between">
           <p className="text-muted-foreground mb-3 text-xs sm:mb-4 sm:text-sm md:mb-0">
             © 2025 Moneko. All rights reserved.
           </p>

           {/* Social Icons */}
           <div className="flex space-x-4 sm:space-x-6">
             <a
               href="https://www.facebook.com/monekoai/"
               target="_blank"
               rel="noopener noreferrer"
               aria-label="Moneko on Facebook"
               className="text-muted-foreground hover:text-primary touch-manipulation transition-colors active:scale-95"
             >
               <FontAwesomeIcon
                 icon={faFacebook}
                 className="h-4 w-4 sm:h-5 sm:w-5"
               />
             </a>
             <a
               href="https://x.com/moneko_ai"
               target="_blank"
               rel="noopener noreferrer"
               aria-label="Moneko on X"
               className="text-muted-foreground hover:text-primary touch-manipulation transition-colors active:scale-95"
             >
               <FontAwesomeIcon icon={faX} className="h-4 w-4 sm:h-5 sm:w-5" />
             </a>
             <a
               href="https://www.instagram.com/moneko_ai"
               target="_blank"
               rel="noopener noreferrer"
               aria-label="Moneko on Instagram"
               className="text-muted-foreground hover:text-primary touch-manipulation transition-colors active:scale-95"
             >
               <FontAwesomeIcon
                 icon={faInstagram}
                 className="h-4 w-4 sm:h-5 sm:w-5"
               />
             </a>
           </div>
         </div>
       </div>
     </footer>
     )}
