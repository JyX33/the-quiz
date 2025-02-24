import PropTypes from 'prop-types';
import styled from 'styled-components';

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PageButton = styled.button`
  padding: ${({ theme }) => theme.spacing.sm};
  min-width: 40px;
  background: ${({ theme, $active }) => 
    $active ? theme.primary : theme.background.paper};
  color: ${({ theme, $active }) => 
    $active ? theme.text.primary : theme.text.secondary};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  
  &:hover:not(:disabled) {
    background: ${({ theme, $active }) => 
      $active ? theme.primary : theme.background.accent};
  }
`;

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if totalPages <= maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      let startPage;
      let endPage;
      
      if (currentPage <= 3) {
        // Near the start
        startPage = 2;
        endPage = 4;
        pages.push(...[2, 3, 4]);
        
        // Add ellipsis and last page
        if (totalPages > 5) {
          pages.push('...');
          pages.push(totalPages);
        } else {
          pages.push(5);
        }
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('...');
        
        startPage = totalPages - 3;
        endPage = totalPages - 1;
        pages.push(...[startPage, endPage, totalPages]);
      } else {
        // Somewhere in the middle
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <PaginationContainer>
      <PageButton
        onClick={() => handlePageChange(currentPage - 1)}
        $disabled={currentPage === 1}
        disabled={currentPage === 1}
      >
        &lt;
      </PageButton>
      
      {getPageNumbers().map((page, index) => (
        page === '...' ? (
          <PageButton key={`ellipsis-${index}`} disabled>
            ...
          </PageButton>
        ) : (
          <PageButton
            key={page}
            $active={page === currentPage}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </PageButton>
        )
      ))}
      
      <PageButton
        onClick={() => handlePageChange(currentPage + 1)}
        $disabled={currentPage === totalPages}
        disabled={currentPage === totalPages}
      >
        &gt;
      </PageButton>
    </PaginationContainer>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired
};

export default Pagination;