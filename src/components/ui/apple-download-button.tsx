
import classNames from 'classnames';
import {faApple} from "@fortawesome/free-brands-svg-icons"
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"

export const AppleDownloadButton=(props:{className?:string})=>{
    return  <div className="flex items-center justify-center">
                <a
                  href="https://testflight.apple.com/join/Q9rNbkN5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classNames("inline-flex items-center gap-2 rounded-2xl bg-black text-white dark:bg-white dark:text-black px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 transition-opacity",props.className)}
                >
                  <FontAwesomeIcon icon={faApple} className="text-xl w-auto" />
                  Download on TestFlight
                </a>
              </div>
}