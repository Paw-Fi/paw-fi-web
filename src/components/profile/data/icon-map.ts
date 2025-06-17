import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faBitcoin, faEthereum, faPaypal, faCcVisa, faCcMastercard, faCcAmex, faApplePay, faGooglePay } from "@fortawesome/free-brands-svg-icons";
import { faMoneyBill, faCreditCard, faWallet, faPiggyBank, faCoins, faSackDollar, faMoneyBillWave, faHandHoldingDollar, faMoneyCheckDollar, faReceipt, faFileInvoiceDollar, faDonate, faHandHoldingDroplet, faLandmark, faCashRegister, faFileContract, faFileSignature, faGift, faGem, faDollarSign, faEuroSign, faPoundSign, faYenSign, faRubleSign, faRupeeSign, faWonSign, faLiraSign, faShekelSign, faChartBar, faChartLine, faChartPie, faChartArea, faChartColumn, faChartGantt, faChartSimple, faSquarePollVertical, faSquarePollHorizontal, faDatabase, faTable, faTableCells, faTableColumns, faTableList, faFilter, faSort, faSortUp, faSortDown, faMagnifyingGlassChart, faNetworkWired, faBuilding, faBuildingColumns, faBriefcase, faCalculator, faPercent, faTags, faTag, faScaleBalanced, faScaleUnbalanced, faScaleUnbalancedFlip, faAddressBook, faAddressCard, faArchive, faAward, faBalanceScale, faBook, faBookmark, faBullhorn, faBusinessTime, faCalendarAlt, faClipboard, faClipboardCheck, faClipboardList, faCompass, faCopy, faCut, faEdit, faEnvelope, faEnvelopeOpen, faEraser, faFax, faFile, faFileAlt, faFileExcel, faFilePdf, faFileWord, faFilePowerpoint, faFileArchive, faFolder, faFolderOpen, faPrint, faProjectDiagram, faRegistered, faSave, faSitemap, faStickyNote, faSuitcase, faThumbtack, faUser, faUserCircle, faUserFriends, faUsers, faUserTie, faUserShield, faUserPlus, faUserMinus, faUserCog, faUserEdit, faIdBadge, faIdCard, faChild, faFemale, faMale, faCalendar, faCalendarDays, faCalendarCheck, faCalendarPlus, faCalendarMinus, faCalendarTimes, faClock, faHourglass, faHourglassStart, faHourglassHalf, faHourglassEnd, faStopwatch, faHome, faLightbulb, faShield, faShieldAlt, faShieldVirus, faBullseye, faHandshake, faHeart, faHeartPulse, faBolt, faBoltLightning, faGavel, faTasks, faListCheck, faCheck, faCheckCircle, faCheckDouble, faTimes, faTimesCircle, faPlus, faPlusCircle, faMinus, faMinusCircle, faExclamation, faExclamationCircle, faExclamationTriangle, faInfo, faInfoCircle, faQuestion, faQuestionCircle, faCog, faCogs, faTools, faWrench, faSlidersH, faSearch, faSearchPlus, faSearchMinus, faPowerOff, faTrash, faTrashAlt, faRecycle, faSync, faRedo, faUndo, faStar, faStarHalf, faLink, faUnlink, faPaperclip, faBell, faBellSlash, faEye, faEyeSlash, faMapMarkerAlt, faMapPin, faLocationArrow, faFlag, faTrophy, faThumbsUp, faThumbsDown, faComment, faComments, faQuoteLeft, faQuoteRight, faCode, faCube, faCubes, faPuzzlePiece, faGamepad, faKey, faLock, faLockOpen, faSignInAlt, faSignOutAlt, faExternalLinkAlt, faDownload, faUpload, faShare, faShareSquare, faRocket, faTree, faCloud, faCloudUploadAlt, faCloudDownloadAlt, faServer, faMobileAlt, faTabletAlt, faLaptop, faDesktop, faCamera, faVideo, faMicrophone, faVolumeUp, faVolumeDown, faVolumeMute, faWifi, faRss, faGlobe, faLanguage, faPalette, faSwatchbook, faMagic, faFire, faLeaf, faAnchor, faLifeRing, faBicycle, faCar, faBus, faTrain, faSubway, faPlane, faShip, faMotorcycle, faShoppingCart, faShoppingBag, faStore, faCreditCardAlt, faUmbrellaBeach, faArrowLeft, faArrowRight, faArrowUp, faArrowDown, faChevronLeft, faChevronRight, faChevronUp, faChevronDown, faAngleLeft, faAngleRight, faAngleUp, faAngleDown, faAngleDoubleLeft, faAngleDoubleRight, faAngleDoubleUp, faAngleDoubleDown, faLongArrowAltLeft, faLongArrowAltRight, faLongArrowAltUp, faLongArrowAltDown, faExchangeAlt, faRandom, faDirections, faCompassDrafting, faMap, faLocationDot, faEllipsisH, faEllipsisV, faGripLines, faGripLinesVertical, faBars, faAtom, faBrain, faShapes, faSpinner, faCircleNotch, faAsterisk, faCertificate, faFingerprint, faRoad, faSign, faTerminal, faCodeBranch, faPlug, faNewspaper, faVrCardboard } from "@fortawesome/free-solid-svg-icons";
type FontAwesomePrefix = 'fas' | 'far' | 'fal' | 'fad' | 'fab';
type FontAwesomeIconClass = `${FontAwesomePrefix} fa-${string}`;

// Map of icon names to their corresponding Font Awesome icons
export const iconMap: Record<FontAwesomeIconClass, IconProp> = {
    // Financial & Currency Icons
    'fas fa-money-bill': faMoneyBill,
    'fas fa-credit-card': faCreditCard,
    'fas fa-wallet': faWallet,
    'fas fa-piggy-bank': faPiggyBank,
    'fas fa-coins': faCoins,
    'fas fa-sack-dollar': faSackDollar,
    'fas fa-money-bill-wave': faMoneyBillWave,
    'fas fa-hand-holding-dollar': faHandHoldingDollar, // Alias for fa-hand-holding-usd
    'fas fa-money-check-dollar': faMoneyCheckDollar,
    'fas fa-receipt': faReceipt,
    'fas fa-file-invoice-dollar': faFileInvoiceDollar,
    'fas fa-donate': faDonate,
    'fas fa-hand-holding-droplet': faHandHoldingDroplet,
    'fas fa-landmark': faLandmark,
    'fas fa-cash-register': faCashRegister,
    'fas fa-file-contract': faFileContract,
    'fas fa-file-signature': faFileSignature,
    'fas fa-gift': faGift,
    'fas fa-gem': faGem, // (far fa-gem for regular style)
    'fab fa-bitcoin': faBitcoin,
    'fab fa-ethereum': faEthereum,
    'fab fa-paypal': faPaypal,
    'fab fa-cc-visa': faCcVisa,
    'fab fa-cc-mastercard': faCcMastercard,
    'fab fa-cc-amex': faCcAmex,
    'fab fa-apple-pay': faApplePay,
    'fab fa-google-pay': faGooglePay,
    'fas fa-dollar-sign': faDollarSign,
    'fas fa-euro-sign': faEuroSign,
    'fas fa-pound-sign': faPoundSign,
    'fas fa-yen-sign': faYenSign,
    'fas fa-ruble-sign': faRubleSign,
    'fas fa-rupee-sign': faRupeeSign,
    'fas fa-won-sign': faWonSign,
    'fas fa-lira-sign': faLiraSign,
    'fas fa-shekel-sign': faShekelSign,
  
    // Chart & Data Icons
    'fas fa-chart-bar': faChartBar, // (far fa-chart-bar for regular style)
    'fas fa-chart-line': faChartLine,
    'fas fa-chart-pie': faChartPie,
    'fas fa-chart-area': faChartArea,
    'fas fa-chart-column': faChartColumn,
    'fas fa-chart-gantt': faChartGantt,
    'fas fa-chart-simple': faChartSimple,
    'fas fa-square-poll-vertical': faSquarePollVertical,
    'fas fa-square-poll-horizontal': faSquarePollHorizontal,
    'fas fa-database': faDatabase,
    'fas fa-table': faTable,
    'fas fa-table-cells': faTableCells,
    'fas fa-table-columns': faTableColumns,
    'fas fa-table-list': faTableList,
    'fas fa-filter': faFilter,
    'fas fa-sort': faSort,
    'fas fa-sort-up': faSortUp,
    'fas fa-sort-down': faSortDown,
    'fas fa-magnifying-glass-chart': faMagnifyingGlassChart,
    'fas fa-network-wired': faNetworkWired,
  
    // Business & Office Icons
    'fas fa-building': faBuilding, // (far fa-building for regular style)
    'fas fa-building-columns': faBuildingColumns, // Alias for fa-university / fa-bank
    'fas fa-briefcase': faBriefcase,
    'fas fa-calculator': faCalculator,
    'fas fa-percent': faPercent,
    'fas fa-tags': faTags,
    'fas fa-tag': faTag,
    'fas fa-scale-balanced': faScaleBalanced,
    'fas fa-scale-unbalanced': faScaleUnbalanced,
    'fas fa-scale-unbalanced-flip': faScaleUnbalancedFlip,
    'fas fa-address-book': faAddressBook, // (far fa-address-book for regular style)
    'fas fa-address-card': faAddressCard, // (far fa-address-card for regular style)
    'fas fa-archive': faArchive, // Alias for fa-box-archive
    'fas fa-award': faAward,
    'fas fa-balance-scale': faBalanceScale, // Alias for fa-scale-balanced
    'fas fa-book': faBook,
    'fas fa-bookmark': faBookmark, // (far fa-bookmark for regular style)
    'fas fa-bullhorn': faBullhorn,
    'fas fa-business-time': faBusinessTime,
    'fas fa-calendar-alt': faCalendarAlt, // Alias for fa-calendar-days
    'fas fa-clipboard': faClipboard, // (far fa-clipboard for regular style)
    'fas fa-clipboard-check': faClipboardCheck,
    'fas fa-clipboard-list': faClipboardList,
    'fas fa-compass': faCompass, // (far fa-compass for regular style)
    'fas fa-copy': faCopy, // (far fa-copy for regular style)
    'fas fa-cut': faCut, // Alias for fa-scissors
    'fas fa-edit': faEdit, // Alias for fa-pen-to-square (far for regular)
    'fas fa-envelope': faEnvelope, // (far fa-envelope for regular style)
    'fas fa-envelope-open': faEnvelopeOpen, // (far fa-envelope-open for regular style)
    'fas fa-eraser': faEraser,
    'fas fa-fax': faFax,
    'fas fa-file': faFile, // (far fa-file for regular style)
    'fas fa-file-alt': faFileAlt, // Alias for fa-file-lines (far for regular)
    'fas fa-file-excel': faFileExcel, // (far fa-file-excel for regular style)
    'fas fa-file-pdf': faFilePdf, // (far fa-file-pdf for regular style)
    'fas fa-file-word': faFileWord, // (far fa-file-word for regular style)
    'fas fa-file-powerpoint': faFilePowerpoint, // (far fa-file-powerpoint for regular style)
    'fas fa-file-archive': faFileArchive, // Alias for fa-file-zipper (far for regular)
    'fas fa-folder': faFolder, // (far fa-folder for regular style)
    'fas fa-folder-open': faFolderOpen, // (far fa-folder-open for regular style)
    'fas fa-print': faPrint,
    'fas fa-project-diagram': faProjectDiagram, // Alias for fa-diagram-project
    'fas fa-registered': faRegistered, // (far fa-registered for regular style)
    'fas fa-save': faSave, // Alias for fa-floppy-disk (far for regular)
    'fas fa-sitemap': faSitemap,
    'fas fa-sticky-note': faStickyNote, // (far fa-sticky-note for regular style)
    'fas fa-suitcase': faSuitcase,
    'fas fa-thumbtack': faThumbtack,
  
    // User & People Icons
    'fas fa-user': faUser, // (far fa-user for regular style)
    'fas fa-user-circle': faUserCircle, // (far fa-user-circle for regular style)
    'fas fa-user-friends': faUserFriends, // Alias for fa-user-group
    'fas fa-users': faUsers,
    'fas fa-user-tie': faUserTie,
    'fas fa-user-shield': faUserShield,
    'fas fa-user-plus': faUserPlus,
    'fas fa-user-minus': faUserMinus,
    'fas fa-user-cog': faUserCog, // Alias for fa-user-gear
    'fas fa-user-edit': faUserEdit, // Alias for fa-user-pen
    'fas fa-id-badge': faIdBadge, // (far fa-id-badge for regular style)
    'fas fa-id-card': faIdCard, // (far fa-id-card for regular style)
    'fas fa-child': faChild,
    'fas fa-female': faFemale, // Alias for fa-person-dress
    'fas fa-male': faMale, // Alias for fa-person
  
    // Time & Date Icons
    'fas fa-calendar': faCalendar, // (far fa-calendar for regular style)
    'fas fa-calendar-days': faCalendarDays, // (far fa-calendar-days for regular style)
    'fas fa-calendar-check': faCalendarCheck, // (far fa-calendar-check for regular style)
    'fas fa-calendar-plus': faCalendarPlus, // (far fa-calendar-plus for regular style)
    'fas fa-calendar-minus': faCalendarMinus, // (far fa-calendar-minus for regular style)
    'fas fa-calendar-times': faCalendarTimes, // Alias for fa-calendar-xmark (far for regular)
    'fas fa-clock': faClock, // (far fa-clock for regular style)
    'fas fa-hourglass': faHourglass, // (far fa-hourglass for regular style)
    'fas fa-hourglass-start': faHourglassStart, // Alias for fa-hourglass-half (old)
    'fas fa-hourglass-half': faHourglassHalf,
    'fas fa-hourglass-end': faHourglassEnd,
    'fas fa-stopwatch': faStopwatch,
  
    // General & UI Icons
    'fas fa-home': faHome, // Alias for fa-house
    'fas fa-lightbulb': faLightbulb, // (far fa-lightbulb for regular style)
    'fas fa-shield': faShield, // Alias for fa-shield-halved
    'fas fa-shield-alt': faShieldAlt, // Alias for fa-shield-halved (old)
    'fas fa-shield-virus': faShieldVirus,
    'fas fa-target': faBullseye, // Alias for fa-bullseye
    'fas fa-bullseye': faBullseye,
    'fas fa-handshake': faHandshake, // (far fa-handshake for regular style)
    'fas fa-heart': faHeart, // (far fa-heart for regular style)
    'fas fa-heart-pulse': faHeartPulse, // Alias for fa-heartbeat
    'fas fa-bolt': faBolt,
    'fas fa-bolt-lightning': faBoltLightning,
    'fas fa-gavel': faGavel,
    'fas fa-tasks': faTasks, // Alias for fa-list-check
    'fas fa-list-check': faListCheck,
    'fas fa-check': faCheck,
    'fas fa-check-circle': faCheckCircle, // (far fa-check-circle for regular style)
    'fas fa-check-double': faCheckDouble,
    'fas fa-times': faTimes, // Alias for fa-xmark
    'fas fa-times-circle': faTimesCircle, // Alias for fa-circle-xmark (far for regular)
    'fas fa-plus': faPlus,
    'fas fa-plus-circle': faPlusCircle,
    'fas fa-minus': faMinus,
    'fas fa-minus-circle': faMinusCircle,
    'fas fa-exclamation': faExclamation,
    'fas fa-exclamation-circle': faExclamationCircle,
    'fas fa-exclamation-triangle': faExclamationTriangle, // Alias for fa-triangle-exclamation
    'fas fa-info': faInfo,
    'fas fa-info-circle': faInfoCircle,
    'fas fa-question': faQuestion,
    'fas fa-question-circle': faQuestionCircle, // (far fa-question-circle for regular style)
    'fas fa-cog': faCog, // Alias for fa-gear
    'fas fa-cogs': faCogs, // Alias for fa-gears
    'fas fa-tools': faTools, // Alias for fa-screwdriver-wrench
    'fas fa-wrench': faWrench,
    'fas fa-sliders-h': faSlidersH, // Alias for fa-sliders
    'fas fa-search': faSearch, // Alias for fa-magnifying-glass
    'fas fa-search-plus': faSearchPlus, // Alias for fa-magnifying-glass-plus
    'fas fa-search-minus': faSearchMinus, // Alias for fa-magnifying-glass-minus
    'fas fa-power-off': faPowerOff,
    'fas fa-trash': faTrash,
    'fas fa-trash-alt': faTrashAlt, // Alias for fa-trash-can (far for regular)
    'fas fa-recycle': faRecycle,
    'fas fa-sync': faSync, // Alias for fa-rotate
    'fas fa-redo': faRedo, // Alias for fa-rotate-right
    'fas fa-undo': faUndo, // Alias for fa-rotate-left
    'fas fa-star': faStar, // (far fa-star for regular style)
    'fas fa-star-half': faStarHalf, // (far fa-star-half for regular style)
    'fas fa-link': faLink,
    'fas fa-unlink': faUnlink, // Alias for fa-link-slash
    'fas fa-paperclip': faPaperclip,
    'fas fa-bell': faBell, // (far fa-bell for regular style)
    'fas fa-bell-slash': faBellSlash, // (far fa-bell-slash for regular style)
    'fas fa-eye': faEye, // (far fa-eye for regular style)
    'fas fa-eye-slash': faEyeSlash, // (far fa-eye-slash for regular style)
    'fas fa-map-marker-alt': faMapMarkerAlt, // Alias for fa-location-dot
    'fas fa-map-pin': faMapPin,
    'fas fa-location-arrow': faLocationArrow,
    'fas fa-flag': faFlag, // (far fa-flag for regular style)
    'fas fa-trophy': faTrophy,
    'fas fa-thumbs-up': faThumbsUp, // (far fa-thumbs-up for regular style)
    'fas fa-thumbs-down': faThumbsDown, // (far fa-thumbs-down for regular style)
    'fas fa-comment': faComment, // (far fa-comment for regular style)
    'fas fa-comments': faComments, // (far fa-comments for regular style)
    'fas fa-quote-left': faQuoteLeft,
    'fas fa-quote-right': faQuoteRight,
    'fas fa-code': faCode,
    'fas fa-cube': faCube,
    'fas fa-cubes': faCubes,
    'fas fa-puzzle-piece': faPuzzlePiece,
    'fas fa-gamepad': faGamepad,
    'fas fa-key': faKey,
    'fas fa-lock': faLock,
    'fas fa-lock-open': faLockOpen,
    'fas fa-sign-in-alt': faSignInAlt, // Alias for fa-right-to-bracket
    'fas fa-sign-out-alt': faSignOutAlt, // Alias for fa-right-from-bracket
    'fas fa-external-link-alt': faExternalLinkAlt, // Alias for fa-up-right-from-square
    'fas fa-download': faDownload,
    'fas fa-upload': faUpload,
    'fas fa-share': faShare,
    'fas fa-share-square': faShareSquare, // Alias for fa-share-from-square (far for regular)
    'fas fa-rocket': faRocket,
    'fas fa-tree': faTree,
    'fas fa-cloud': faCloud,
    'fas fa-cloud-upload-alt': faCloudUploadAlt, // Alias for fa-cloud-arrow-up
    'fas fa-cloud-download-alt': faCloudDownloadAlt, // Alias for fa-cloud-arrow-down
    'fas fa-server': faServer,
    'fas fa-mobile-alt': faMobileAlt, // Alias for fa-mobile-screen-button
    'fas fa-tablet-alt': faTabletAlt, // Alias for fa-tablet-screen-button
    'fas fa-laptop': faLaptop,
    'fas fa-desktop': faDesktop,
    'fas fa-camera': faCamera,
    'fas fa-video': faVideo,
    'fas fa-microphone': faMicrophone,
    'fas fa-volume-up': faVolumeUp,
    'fas fa-volume-down': faVolumeDown,
    'fas fa-volume-mute': faVolumeMute, // Alias for fa-volume-xmark
    'fas fa-wifi': faWifi,
    'fas fa-rss': faRss, // Alias for fa-square-rss
    'fas fa-globe': faGlobe,
    'fas fa-language': faLanguage,
    'fas fa-palette': faPalette,
    'fas fa-swatchbook': faSwatchbook,
    'fas fa-magic': faMagic, // Alias for fa-wand-magic
    'fas fa-fire': faFire,
    'fas fa-leaf': faLeaf,
    'fas fa-anchor': faAnchor,
    'fas fa-life-ring': faLifeRing, // (far fa-life-ring for regular style)
    'fas fa-bicycle': faBicycle,
    'fas fa-car': faCar,
    'fas fa-bus': faBus,
    'fas fa-train': faTrain,
    'fas fa-subway': faSubway, // Alias for fa-train-subway
    'fas fa-plane': faPlane,
    'fas fa-ship': faShip,
    'fas fa-motorcycle': faMotorcycle,
    'fas fa-shopping-cart': faShoppingCart, // Alias for fa-cart-shopping
    'fas fa-shopping-bag': faShoppingBag, // Alias for fa-bag-shopping
    'fas fa-store': faStore,
    'fas fa-credit-card-alt': faCreditCardAlt, // No direct new alias, use fa-credit-card
    'fas fa-umbrella-beach': faUmbrellaBeach,
  
    // Arrows & Navigation
    'fas fa-arrow-left': faArrowLeft,
    'fas fa-arrow-right': faArrowRight,
    'fas fa-arrow-up': faArrowUp,
    'fas fa-arrow-down': faArrowDown,
    'fas fa-chevron-left': faChevronLeft,
    'fas fa-chevron-right': faChevronRight,
    'fas fa-chevron-up': faChevronUp,
    'fas fa-chevron-down': faChevronDown,
    'fas fa-angle-left': faAngleLeft,
    'fas fa-angle-right': faAngleRight,
    'fas fa-angle-up': faAngleUp,
    'fas fa-angle-down': faAngleDown,
    'fas fa-angle-double-left': faAngleDoubleLeft, // Alias for fa-angles-left
    'fas fa-angle-double-right': faAngleDoubleRight, // Alias for fa-angles-right
    'fas fa-angle-double-up': faAngleDoubleUp, // Alias for fa-angles-up
    'fas fa-angle-double-down': faAngleDoubleDown, // Alias for fa-angles-down
    'fas fa-long-arrow-alt-left': faLongArrowAltLeft, // Alias for fa-long-arrow-left
    'fas fa-long-arrow-alt-right': faLongArrowAltRight, // Alias for fa-long-arrow-right
    'fas fa-long-arrow-alt-up': faLongArrowAltUp, // Alias for fa-long-arrow-up
    'fas fa-long-arrow-alt-down': faLongArrowAltDown, // Alias for fa-long-arrow-down
    'fas fa-exchange-alt': faExchangeAlt, // Alias for fa-right-left
    'fas fa-random': faRandom, // Alias for fa-shuffle
    'fas fa-directions': faDirections,
    'fas fa-compass-drafting': faCompassDrafting,
    'fas fa-map': faMap, // (far fa-map for regular style)
    'fas fa-location-dot': faLocationDot,
  
    // Default / Fallback
    'fas fa-question-circle-o': faQuestionCircle, // Fallback for unknown, using regular style for question mark
    'fas fa-ellipsis-h': faEllipsisH, // Horizontal ellipsis
    'fas fa-ellipsis-v': faEllipsisV, // Vertical ellipsis
    'fas fa-grip-lines': faGripLines,
    'fas fa-grip-lines-vertical': faGripLinesVertical,
    'fas fa-bars': faBars, // Hamburger menu
    'fas fa-atom': faAtom,
    'fas fa-brain': faBrain,
    'fas fa-shapes': faShapes,
    'fas fa-puzzle-piece-alt': faPuzzlePiece, // Using main puzzle piece
    'fas fa-spinner': faSpinner,
    'fas fa-circle-notch': faCircleNotch,
    'fas fa-cog-o': faCog, // Using main cog
    'fas fa-sync-alt': faSync, // Using main sync
    'fas fa-asterisk': faAsterisk,
    'fas fa-certificate': faCertificate,
    'fas fa-fingerprint': faFingerprint,
    'fas fa-road': faRoad,
    'fas fa-sign': faSign, // Alias for fa-map-signs or fa-sign-hanging
    'fas fa-terminal': faTerminal,
    'fas fa-code-branch': faCodeBranch,
    'fas fa-plug': faPlug,
    'fas fa-newspaper': faNewspaper, // (far fa-newspaper for regular style)
    'fas fa-vr-cardboard': faVrCardboard,
    'fas fa-game-console-handheld': faGamepad, // Simplified to gamepad
  };