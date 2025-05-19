import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getAllInterviews } from '../../../services/interviewAPI';
import type { InterviewSummary, InterviewListParams } from '../../../services/interviewAPI';
import styles from './AdminInterviewsOverviewPage.module.css';
import Button from '../../../components/common/Button/Button';

const ITEMS_PER_PAGE = 15;

const AdminInterviewsOverviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<Partial<InterviewListParams>>({
    status: '',
    candidate_id: '',
    hr_id: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInterviews, setTotalInterviews] = useState(0); // Assuming backend might provide total for pagination

  const fetchInterviews = useCallback(async (page: number = 1) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setIsLoading(true);
    setError(null);

    const params: InterviewListParams = {
      ...filters,
      limit: ITEMS_PER_PAGE,
      skip: (page - 1) * ITEMS_PER_PAGE,
    };
    // Remove empty filters
    Object.keys(params).forEach(key => {
      if (!params[key as keyof InterviewListParams]) {
        delete params[key as keyof InterviewListParams];
      }
    });

    try {
      // Assuming getAllInterviews might be enhanced to return paginated data
      // For now, it returns InterviewSummary[]
      const data = await getAllInterviews(params);
      setInterviews(data);
      // Mocking totalInterviews for now if backend doesn't send it
      // In a real scenario, backend would send total count for pagination
      setTotalInterviews(data.length); // This will be incorrect if backend paginates
                                      // and only returns one page of data.
                                      // This page will not have full pagination until backend supports it for this endpoint.
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'Failed to load interviews.');
      console.error("Error fetching interviews:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, filters, setIsLoading, setError, setInterviews, setTotalInterviews]);

  useEffect(() => {
    fetchInterviews(currentPage);
  }, [fetchInterviews, currentPage]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1); // Reset to first page on filter change
  };
  
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInterviews(1); // Fetch with current filters from page 1
  };

  // Basic pagination (if backend supports it, otherwise this is illustrative)
  const totalPages = Math.ceil(totalInterviews / ITEMS_PER_PAGE);
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };


  if (isLoading && interviews.length === 0) {
    return <MainLayout><div>Loading interviews...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.overviewContainer}>
        <h1>All Interviews Overview</h1>
        
        <form onSubmit={handleFilterSubmit} className={styles.filterForm}>
          <div className={styles.formGroup}>
            <label htmlFor="status">Status:</label>
            <select name="status" id="status" value={filters.status || ''} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="pending_questions">Pending Questions</option>
              <option value="completed">Completed</option>
              <option value="evaluated">Evaluated</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="candidate_id">Candidate ID:</label>
            <input type="text" name="candidate_id" id="candidate_id" value={filters.candidate_id || ''} onChange={handleFilterChange} />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="hr_id">HR ID (Scheduled By):</label>
            <input type="text" name="hr_id" id="hr_id" value={filters.hr_id || ''} onChange={handleFilterChange} />
          </div>
          <Button type="submit" variant="primary">Apply Filters</Button>
        </form>

        {error && <p className={styles.errorMessage}>{error}</p>}
        {isLoading && <p>Loading...</p>}

        {!isLoading && interviews.length === 0 && <p>No interviews found matching criteria.</p>}

        {interviews.length > 0 && (
          <>
            <table className={styles.interviewsTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Job Title</th>
                  <th>Status</th>
                  <th>Scheduled At</th>
                  <th>Completed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map(interview => (
                  <tr key={interview.id}>
                    <td>{interview.id}</td>
                    <td>{interview.job_title}</td>
                    <td><span className={`${styles.status} ${styles[interview.status.toLowerCase()]}`}>{interview.status}</span></td>
                    <td>{new Date(interview.scheduled_at).toLocaleString()}</td>
                    <td>{interview.completed_at ? new Date(interview.completed_at).toLocaleString() : 'N/A'}</td>
                    <td>
                      <Link to={`/admin/interviews/${interview.id}/details`} className={styles.detailsLink}>View Details</Link>
                      {/* Placeholder for more actions */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Basic Pagination (illustrative, needs backend support for total count) */}
            {totalPages > 1 && (
              <div className={styles.paginationControls}>
                <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                <span>Page {currentPage} of {totalPages} (Showing {interviews.length} of {totalInterviews})</span>
                <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
              </div>
            )}
          </>
        )}
        <Link to="/admin/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    </MainLayout>
  );
};

export default AdminInterviewsOverviewPage;
