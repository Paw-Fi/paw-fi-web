import classNames from 'classnames';
import { faGooglePlay } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const AndroidDownloadButton = (props: { className?: string }) => {
  return (
    <div className="flex items-center justify-center">
      <a
        href="https://play.google.com/store/apps/details?id=com.moneko.mobile"
        target="_blank"
        rel="noopener noreferrer"
        className={classNames(
          "inline-flex items-center gap-2 rounded-2xl bg-black text-white dark:bg-white dark:text-black px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 transition-opacity",
          props.className,
        )}
      >
        <FontAwesomeIcon icon={faGooglePlay} className="text-lg w-5 h-5" />
        Get it on Google Play
      </a>
    </div>
  );
};
