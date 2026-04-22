import { Iphone } from "@/components/ui/iphone";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { ChatScreen } from "./chat-screen";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useReducedVisualEffects } from "@/hooks/use-reduced-visual-effects";

export function HeroV2() {
  const reducedVisualEffects = useReducedVisualEffects();

  return (
    <div className="relative overflow-hidden pt-[4rem] pb-16 md:pt-[6rem]">
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center gap-12 text-center lg:gap-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center space-y-8">
             <div className="text-muted-foreground flex items-center justify-center gap-2 pt-4 text-sm">
              <span>Join us on</span>
              <a
                href="https://discord.gg/M2Dgujvtze"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary font-medium underline underline-offset-4"
              >
                Discord
              </a>
              <span>and</span>
              <a
                href="https://www.reddit.com/r/monekobudget/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary font-medium underline underline-offset-4"
              >
                Reddit
              </a>
            </div>

            <h1 className="from-foreground to-foreground/70 bg-gradient-to-b bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl xl:text-7xl">
              The AI budgeting app <br />
              <span className="text-primary">built for everyday spending.</span>
            </h1>

            <p className="text-muted-foreground mx-auto max-w-[42rem] text-lg leading-relaxed sm:text-xl">
              Track expenses from WhatsApp, receipts, voice notes, and mobile
              alerts. Organize money into Pockets, split shared costs, and ask
              Moneko what changed before the month gets away from you.
            </p>

            <div className="flex w-auto flex-col justify-center gap-4 sm:flex-row">
              <AppleDownloadButton className="w-auto" />
              <AndroidDownloadButton className="w-auto" />
            </div>

            <div className="text-muted-foreground flex items-center justify-center gap-4 pt-4 text-sm">
              <div className="flex -space-x-2">
                {/* WhatsApp */}
                {/* <a href="https://iconscout.com/icons/whatsapp" class="text-underline font-size-sm" target="_blank">whatsapp</a> by <a href="https://iconscout.com/contributors/manoj10101996" class="text-underline font-size-sm">Manojkumar Muthukumar</a> on <a href="https://iconscout.com" class="text-underline font-size-sm">IconScout</a>*/}
                <svg
                  className="size-8"
                  xmlns="http://www.w3.org/2000/svg"
                  width="256"
                  height="256"
                  fill="none"
                  viewBox="0 0 256 256"
                  id="whatsapp"
                >
                  <rect
                    width="224"
                    height="224"
                    x="16"
                    y="16"
                    fill="#EEE"
                    rx="70"
                  ></rect>
                  <path
                    fill="#25D366"
                    d="M194.102 124.998C193.48 107.969 186.305 91.8396 174.073 79.9765C161.842 68.1134 145.5 61.434 128.461 61.333H128.139C116.665 61.3245 105.386 64.3036 95.4122 69.9771C85.4385 75.6506 77.1138 83.823 71.2571 93.6902C65.4004 103.558 62.2137 114.78 62.0104 126.252C61.8071 137.725 64.5942 149.053 70.0976 159.121L64.2539 194.09C64.2444 194.161 64.2502 194.234 64.2711 194.304C64.292 194.373 64.3274 194.437 64.3749 194.492C64.4225 194.546 64.4811 194.59 64.5469 194.62C64.6127 194.65 64.6841 194.666 64.7565 194.666H64.857L99.4435 186.973C108.38 191.263 118.166 193.489 128.079 193.487C128.709 193.487 129.339 193.487 129.969 193.487C138.689 193.238 147.273 191.265 155.226 187.681C163.179 184.097 170.344 178.973 176.306 172.605C182.269 166.238 186.912 158.753 189.966 150.581C193.02 142.41 194.426 133.715 194.102 124.998ZM129.64 181.993C129.118 181.993 128.595 181.993 128.079 181.993C119.318 182.005 110.683 179.908 102.901 175.882L101.132 174.957L77.677 180.499L82.0061 156.769L81.001 155.067C76.1998 146.882 73.6138 137.586 73.4976 128.097C73.3814 118.608 75.7389 109.252 80.3381 100.952C84.9373 92.6507 91.6193 85.6911 99.7263 80.7582C107.833 75.8252 117.085 73.0892 126.571 72.8194C127.098 72.8194 127.628 72.8194 128.159 72.8194C142.482 72.8619 156.214 78.5289 166.397 88.5995C176.581 98.6701 182.401 112.338 182.603 126.659C182.805 140.98 177.373 154.806 167.478 165.161C157.582 175.515 144.016 181.567 129.701 182.014L129.64 181.993Z"
                  ></path>
                  <path
                    fill="#25D366"
                    d="M102.737 96.0382C103.483 95.7055 104.288 95.526 105.104 95.51L105.245 95.4899C106.351 95.5234 107.457 95.5569 108.422 95.624L108.429 95.6245C109.6 95.7115 110.937 95.8108 112.061 98.653C113.448 101.984 116.403 110.287 116.798 111.131C117.047 111.574 117.181 112.072 117.189 112.58C117.198 113.087 117.079 113.589 116.846 114.04C116.394 115.011 115.807 115.913 115.103 116.72C114.245 117.665 113.354 118.757 112.523 119.549C111.692 120.339 110.781 121.21 111.692 122.899C114.05 127.25 117.04 131.227 120.565 134.7C124.337 138.394 128.767 141.349 133.626 143.412C134.188 143.707 134.808 143.874 135.442 143.902C135.786 143.896 136.125 143.817 136.437 143.672C136.748 143.526 137.026 143.317 137.251 143.057C138.284 142.012 141.36 138.386 142.7 136.717C142.909 136.375 143.198 136.088 143.542 135.883C143.887 135.677 144.276 135.559 144.677 135.538C145.292 135.584 145.894 135.74 146.453 136C147.961 136.604 155.982 140.892 157.618 141.75C159.253 142.608 160.338 143.091 160.734 143.761C161.129 144.431 161.029 147.782 159.527 151.615C158.026 155.448 151.144 158.973 148.094 159.161C147.19 159.215 146.326 159.335 145.179 159.335C142.398 159.335 138.11 158.612 128.325 154.396C111.678 147.246 101.573 129.614 100.775 128.481L100.769 128.472C99.9478 127.306 94.2755 119.252 94.5294 111.111C94.7841 102.949 99.187 99.0618 100.762 97.4468C101.319 96.8499 101.991 96.3709 102.737 96.0382Z"
                  ></path>
                </svg>
                {/* Telegram */}
                {/* <a href="https://iconscout.com/icons/telegram" class="text-underline font-size-sm" target="_blank">telegram</a> by <a href="https://iconscout.com/contributors/manoj10101996" class="text-underline font-size-sm" target="_blank">Manojkumar Muthukumar</a> */}
                <svg
                  className="size-8"
                  xmlns="http://www.w3.org/2000/svg"
                  width="256"
                  height="256"
                  fill="none"
                  viewBox="0 0 256 256"
                  id="telegram"
                >
                  <rect
                    width="224"
                    height="224"
                    x="16"
                    y="16"
                    fill="#EEE"
                    rx="70"
                  ></rect>
                  <path
                    fill="url(#paint0_linear_533_2162)"
                    fill-rule="evenodd"
                    d="M80.8652 80.859C93.3548 68.3611 110.324 61.333 128.001 61.333C145.678 61.333 162.646 68.3611 175.136 80.859C187.636 93.357 194.667 110.326 194.667 128C194.667 145.674 187.636 162.642 175.136 175.14C162.646 187.638 145.678 194.666 128.001 194.666C110.324 194.666 93.3548 187.638 80.8652 175.14C68.3652 162.642 61.334 145.674 61.334 128C61.3374 110.318 68.3628 93.3619 80.8652 80.859ZM130.385 110.547C123.906 113.244 110.948 118.827 91.5104 127.293C88.3541 128.549 86.6979 129.777 86.552 130.977C86.2955 133.004 88.8343 133.803 92.2839 134.89C92.7571 135.039 93.2474 135.193 93.7499 135.357C97.1562 136.463 101.74 137.758 104.115 137.809C106.281 137.856 108.687 136.965 111.344 135.138C129.51 122.881 138.875 116.685 139.469 116.552C139.885 116.458 140.458 116.339 140.844 116.686C141.24 117.032 141.198 117.688 141.156 117.864C140.91 118.935 130.975 128.172 125.805 132.979C124.18 134.49 123.026 135.563 122.792 135.807C122.268 136.35 121.735 136.865 121.222 137.359C118.061 140.406 115.689 142.692 121.354 146.425C124.101 148.234 126.293 149.727 128.484 151.22C130.839 152.823 133.192 154.426 136.229 156.418C137.01 156.93 137.756 157.462 138.483 157.98C141.244 159.948 143.724 161.716 146.792 161.434C148.573 161.27 150.417 159.595 151.344 154.6C153.552 142.792 157.896 117.211 158.896 106.669C158.99 105.746 158.875 104.564 158.792 104.045C158.698 103.526 158.51 102.787 157.844 102.24C157.042 101.591 155.812 101.455 155.26 101.464C152.75 101.509 148.906 102.846 130.385 110.547Z"
                    clip-rule="evenodd"
                  ></path>
                  <defs>
                    <linearGradient
                      id="paint0_linear_533_2162"
                      x1="128.001"
                      x2="128.001"
                      y1="61.333"
                      y2="194.666"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stop-color="#2AABEE"></stop>
                      <stop offset="1" stop-color="#229ED9"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                {/* Apple Wallet */}
                {/* <a href="https://iconscout.com/icons/wallet" class="text-underline font-size-sm" target="_blank">wallet</a> by <a href="https://iconscout.com/contributors/icon-mafia" class="text-underline font-size-sm">Icon Mafia</a> on <a href="https://iconscout.com" class="text-underline font-size-sm">IconScout</a> */}

                <svg
                  className="size-6 translate-y-1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 120 120"
                  id="wallet"
                >
                  <path
                    fill="#1e1e1f"
                    d="M26,0H94a25.9482,25.9482,0,0,1,26,26V94a25.9482,25.9482,0,0,1-26,26H26A25.9482,25.9482,0,0,1,0,94V26A26.012,26.012,0,0,1,26,0Z"
                  ></path>
                  <path
                    fill="#fff"
                    fill-rule="evenodd"
                    d="M24,30H96a6.01764,6.01764,0,0,1,6,6V70a6.01764,6.01764,0,0,1-6,6H24a6.01764,6.01764,0,0,1-6-6V36A6.01764,6.01764,0,0,1,24,30Z"
                  ></path>
                  <path
                    fill="#d9d6cc"
                    fill-rule="evenodd"
                    d="M22,26H98a8.02352,8.02352,0,0,1,8,8V86a8.02352,8.02352,0,0,1-8,8H22a8.02352,8.02352,0,0,1-8-8V34A8.02352,8.02352,0,0,1,22,26Z"
                  ></path>
                  <path
                    fill="#3b99c9"
                    fill-rule="evenodd"
                    d="M24,30H96a6.01764,6.01764,0,0,1,6,6V70a6.01764,6.01764,0,0,1-6,6H24a6.01764,6.01764,0,0,1-6-6V36A6.01764,6.01764,0,0,1,24,30Z"
                  ></path>
                  <g>
                    <path
                      fill-rule="evenodd"
                      d="M24,37H96a6.01764,6.01764,0,0,1,6,6V55a6.01764,6.01764,0,0,1-6,6H24a6.01764,6.01764,0,0,1-6-6V43A6.01764,6.01764,0,0,1,24,37Z"
                    ></path>
                    <path
                      fill="#ffb003"
                      fill-rule="evenodd"
                      d="M24,37H96a6.01764,6.01764,0,0,1,6,6V55a6.01764,6.01764,0,0,1-6,6H24a6.01764,6.01764,0,0,1-6-6V43A6.01764,6.01764,0,0,1,24,37Z"
                    ></path>
                  </g>
                  <g>
                    <path
                      fill-rule="evenodd"
                      d="M24,44H96a6.01764,6.01764,0,0,1,6,6V62a6.01764,6.01764,0,0,1-6,6H24a6.01764,6.01764,0,0,1-6-6V50A6.01764,6.01764,0,0,1,24,44Z"
                    ></path>
                    <path
                      fill="#50be3d"
                      fill-rule="evenodd"
                      d="M24,44H96a6.01764,6.01764,0,0,1,6,6V62a6.01764,6.01764,0,0,1-6,6H24a6.01764,6.01764,0,0,1-6-6V50A6.01764,6.01764,0,0,1,24,44Z"
                    ></path>
                  </g>
                  <g>
                    <path
                      fill-rule="evenodd"
                      d="M24,51H96a6.01764,6.01764,0,0,1,6,6V69a6.01764,6.01764,0,0,1-6,6H24a6.01764,6.01764,0,0,1-6-6V57A6.01764,6.01764,0,0,1,24,51Z"
                    ></path>
                    <path
                      fill="#f26d5f"
                      fill-rule="evenodd"
                      d="M24,51H96a6.01764,6.01764,0,0,1,6,6V69a6.01764,6.01764,0,0,1-6,6H24a6.01764,6.01764,0,0,1-6-6V57A6.01764,6.01764,0,0,1,24,51Z"
                    ></path>
                  </g>
                  <g>
                    <path
                      fill-rule="evenodd"
                      d="M14,58h92V86a8.02352,8.02352,0,0,1-8,8H22a8.02352,8.02352,0,0,1-8-8Zm27,0c9,0,10,11.5,19,11.5S70,58,79,58Z"
                    ></path>
                    <path
                      fill="#d9d6cc"
                      fill-rule="evenodd"
                      d="M14,58h92V86a8.02352,8.02352,0,0,1-8,8H22a8.02352,8.02352,0,0,1-8-8Zm27,0c9,0,10,11.5,19,11.5S70,58,79,58Z"
                    ></path>
                  </g>
                </svg>
                {/* Google Wallet */}
                {/* <a href="https://iconscout.com/icons/google" class="text-underline font-size-sm" target="_blank">google</a> by <a href="https://iconscout.com/contributors/manoj10101996" class="text-underline font-size-sm" target="_blank">Manojkumar Muthukumar</a> */}
                <svg
                  className="size-8"
                  xmlns="http://www.w3.org/2000/svg"
                  width="256"
                  height="256"
                  fill="none"
                  viewBox="0 0 256 256"
                  id="google"
                >
                  <rect
                    width="224"
                    height="224"
                    x="16"
                    y="16"
                    fill="#EEE"
                    rx="70"
                  ></rect>
                  <path
                    fill="#4285F4"
                    d="M192.224 129.249C192.224 123.786 191.78 119.8 190.821 115.666H128.443V140.321H165.058C164.32 146.449 160.333 155.676 151.475 161.877L151.351 162.702L171.073 177.981L172.44 178.117C184.989 166.528 192.224 149.475 192.224 129.249Z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M128.443 194.208C146.381 194.208 161.44 188.302 172.439 178.115L151.475 161.875C145.864 165.787 138.335 168.518 128.443 168.518C110.874 168.518 95.9625 156.929 90.647 140.91L89.8679 140.976L69.36 156.848L69.0918 157.593C80.017 179.296 102.458 194.208 128.443 194.208Z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M90.6476 140.912C89.245 136.779 88.4333 132.349 88.4333 127.773C88.4333 123.195 89.245 118.766 90.5738 114.633L90.5366 113.752L69.7718 97.626L69.0924 97.9491C64.5896 106.955 62.0059 117.069 62.0059 127.773C62.0059 138.476 64.5896 148.589 69.0924 157.595L90.6476 140.912Z"
                  ></path>
                  <path
                    fill="#EB4335"
                    d="M128.443 87.0221C140.918 87.0221 149.334 92.4109 154.132 96.9142L172.882 78.6068C161.367 67.903 146.381 61.333 128.443 61.333C102.458 61.333 80.017 76.2445 69.0918 97.9473L90.5732 114.631C95.9625 98.6119 110.874 87.0221 128.443 87.0221Z"
                  ></path>
                </svg>
              </div>
              <p>Built for chat-based expense tracking</p>
            </div>

           
          </div>

          <div className="relative mx-auto flex w-full max-w-[350px] justify-center lg:max-w-[400px]">
            

            {/* Decorative background elements */}
            <div
              className={
                reducedVisualEffects
                  ? "bg-primary/10 pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  : "bg-primary/20 pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
