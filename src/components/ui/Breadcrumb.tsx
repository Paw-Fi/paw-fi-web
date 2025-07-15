import React from 'react';
import { Link, useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faHome, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Modern breadcrumb navigation component with structured data for SEO
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const router=useRouter();
  
  const handleGoBack = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Special case for lesson paths
    if (pathSegments.includes('lesson')) {
      const lessonIndex = pathSegments.indexOf('lesson');
      if (lessonIndex > 0) {
        // Go back to the course page, skipping the 'lesson' segment
        const courseSegments = pathSegments.slice(0, lessonIndex);
        navigate({ to: '/' + courseSegments.join('/') });
        return;
      }
    }
    
    // Default behavior - go up one level
    router.history.back();
  };
  // Generate structured data for SEO
  useIsomorphicLayoutEffect(() => {
    const breadcrumbList = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': items.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': item.label,
        'item': item.href
      }))
    };

    // Add structured data to the document head
    const existingScript = document.getElementById('breadcrumb-jsonld');
    if (existingScript) {
      document.head.removeChild(existingScript);
    }

    const script = document.createElement('script');
    script.id = 'breadcrumb-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(breadcrumbList);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('breadcrumb-jsonld');
      if (scriptToRemove) {
        document.head.removeChild(scriptToRemove);
      }
    };
  }, [items]);

  return (
    <nav aria-label="Breadcrumb" className={`${className} flex items-center bg-white/70 rounded-xl shadow-sm border border-gray-100/80 px-4 py-3`}>
      <button 
        onClick={handleGoBack}
        className="mr-4 text-gray-600 hover:text-primary transition-colors rounded-full hover:bg-gray-100 flex items-center justify-center"
        aria-label="Go back"
        title="Go back"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
      </button>
      <ol 
        className="flex flex-wrap items-center text-sm gap-1 text-gray-600"
        itemScope 
        itemType="https://schema.org/BreadcrumbList"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li 
              key={item.href} 
              className="flex items-center"
              itemProp="itemListElement" 
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index === 0 && (
                <FontAwesomeIcon 
                  icon={faHome} 
                  className="mr-1 text-primary" 
                  aria-hidden="true" 
                />
              )}
              
              {isLast ? (
                <span 
                  aria-current="page" 
                  className="font-medium text-primary truncate max-w-[200px] md:max-w-xs"
                  itemProp="name"
                  title={item.label==="Dashboard" ? "Portfolio" : item.label}
                >
                  {item.label==="Dashboard" ? "Portfolio" : item.label}
                </span>
              ) : (
                <>
                  <Link 
                    to={item.href} 
                    className="hover:text-primary transition-colors hover:underline truncate max-w-[120px] md:max-w-[160px]"
                    itemProp="item"
                    title={item.label==="Dashboard" ? "Portfolio" : item.label}
                  >
                    <span itemProp="name">{item.label==="Dashboard" ? "Portfolio" : item.label}</span>
                  </Link>
                  <FontAwesomeIcon 
                    icon={faChevronRight} 
                    className="mx-2 text-gray-400 text-xs flex-shrink-0" 
                    aria-hidden="true" 
                  />
                </>
              )}
              <meta itemProp="position" content={`${index + 1}`} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
