import React, { useState } from 'react';
import styles from './CandidateSearchForm.module.css'; 
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select'; // Import common Select

// Local mock Button removed.

interface SearchFilters {
  keyword?: string;
  skills?: string; // Using string for comma-separated skills, can be string[] with a tag input
  yoeMin?: number; 
  yoeMax?: number;
  education?: string;
  location?: string;
}

interface CandidateSearchFormProps {
  onSearch: (filters: SearchFilters) => void;
}

const CandidateSearchForm: React.FC<CandidateSearchFormProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const [skills, setSkills] = useState(''); // For comma-separated skills
  const [yoeMin, setYoeMin] = useState<string>('');
  const [yoeMax, setYoeMax] = useState<string>('');
  const [education, setEducation] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const filters: SearchFilters = {
      keyword: keyword.trim() || undefined,
      skills: skills.trim() || undefined,
      yoeMin: yoeMin === '' ? undefined : parseInt(yoeMin, 10),
      yoeMax: yoeMax === '' ? undefined : parseInt(yoeMax, 10),
      education: education.trim() || undefined,
      location: location.trim() || undefined,
    };
    onSearch(filters);
  };

  const handleClearFilters = () => {
    setKeyword('');
    setSkills('');
    setYoeMin('');
    setYoeMax('');
    setEducation('');
    setLocation('');
    onSearch({}); // Trigger search with empty filters
  };

  return (
    <form onSubmit={handleSubmit} className={styles.searchForm}>
      <div className={styles.formGrid}>
        <Input
          label="Keyword"
          id="keyword"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="General search (name, resume text)"
          containerClassName={styles.formGroup}
          inputClassName={styles.inputField}
        />
        <Input
          label="Skills (comma-separated)"
          id="skills"
          type="text"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="e.g., React, Node.js, Python"
          containerClassName={styles.formGroup}
          inputClassName={styles.inputField}
        />
        <Input
          label="Min Years of Experience"
          id="yoeMin"
          type="number"
          value={yoeMin}
          onChange={(e) => setYoeMin(e.target.value)}
          placeholder="Min YoE"
          min="0"
          containerClassName={styles.formGroup}
          inputClassName={styles.inputField}
        />
        <Input
          label="Max Years of Experience"
          id="yoeMax"
          type="number"
          value={yoeMax}
          onChange={(e) => setYoeMax(e.target.value)}
          placeholder="Max YoE"
          min="0"
          containerClassName={styles.formGroup}
          inputClassName={styles.inputField}
        />
        <Select
          label="Education Level"
          id="education"
          value={education}
          onChange={(e) => setEducation(e.target.value)}
          options={[
            { value: "", label: "Any Education" },
            { value: "Bachelor's", label: "Bachelor's Degree" },
            { value: "Master's", label: "Master's Degree" },
            { value: "PhD", label: "PhD" },
            { value: "Diploma", label: "Diploma" },
            { value: "Other", label: "Other" },
          ]}
          containerClassName={styles.formGroup}
          selectClassName={styles.selectField}
        />
        <Input
          label="Location"
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., City, Country"
          containerClassName={styles.formGroup}
          inputClassName={styles.inputField}
        />
      </div>

      <div className={styles.formActions}>
        <Button type="submit" className={styles.searchButton} variant="primary">Search</Button>
        <Button type="button" onClick={handleClearFilters} className={styles.clearButton} variant="secondary">Clear Filters</Button>
      </div>
    </form>
  );
};

export default CandidateSearchForm;
