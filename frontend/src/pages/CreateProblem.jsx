import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Plus, Trash2, ChevronLeft } from 'lucide-react';

const CreateProblem = ({ API_BASE, fetchProblems }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description_bn: '',
    input_format_bn: '',
    output_format_bn: '',
    sample_input: '',
    sample_output: '',
    difficulty: 'Easy',
    points: 1,
    tags: [],
    test_cases: []
  });

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadProblemData();
    }
  }, [id]);

  const loadProblemData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/problems/${id}`);
      setFormData({
        title: res.data.title || '',
        description_bn: res.data.description_bn || '',
        input_format_bn: res.data.input_format_bn || '',
        output_format_bn: res.data.output_format_bn || '',
        sample_input: res.data.sample_input || '',
        sample_output: res.data.sample_output || '',
        difficulty: res.data.difficulty || 'Easy',
        points: res.data.points ?? 1,
        tags: res.data.tags || [],
        test_cases: res.data.test_cases || []
      });
    } catch (err) {
      setError('Failed to load problem data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-suggest default points when difficulty changes, unless user already customised it
      if (name === 'difficulty') {
        const defaults = { Easy: 1, Medium: 2, Hard: 3 };
        updated.points = defaults[value] ?? prev.points;
      }
      return updated;
    });
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...formData.test_cases];
    updatedTestCases[index][field] = value;
    setFormData(prev => ({ ...prev, test_cases: updatedTestCases }));
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, { input: '', expected_output: '', is_sample: false }]
    }));
  };

  const removeTestCase = (index) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await axios.put(`${API_BASE}/problems/${id}`, formData);
      } else {
        await axios.post(`${API_BASE}/problems`, formData);
      }
      fetchProblems();
      navigate('/manage');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save problem');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="create-view animate-in">
      <header className="manage-header">
        <div className="header-left">
          <button className="back-btn-v2" onClick={() => navigate('/manage')}>
            <ChevronLeft size={18} /> Back to Manage
          </button>
          <h2 style={{ marginTop: '10px' }}>{isEdit ? 'Update Problem' : 'Add New Problem'}</h2>
        </div>
      </header>

      {error && <div className="error-msg">{error}</div>}

      <form className="glass create-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Problem Title</label>
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Sum of Two Numbers"
            required
          />
        </div>

        <div className="input-group">
          <label>Bangla Description</label>
          <textarea
            name="description_bn"
            value={formData.description_bn}
            onChange={handleChange}
            placeholder="বিস্তারিত বর্ণনা এখানে লিখুন..."
            required
          />
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label>Difficulty</label>
            <select name="difficulty" value={formData.difficulty} onChange={handleChange}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div className="input-group">
            <label>Points Reward</label>
            <input
              type="number"
              name="points"
              value={formData.points}
              onChange={handleChange}
              min="0"
              max="100"
              placeholder="e.g. 5"
              title="Points awarded when a user solves this problem for the first time"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="input-group">
          <label>Tags <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>(press Enter or comma to add)</span></label>
          <div className="tag-input-wrapper">
            {formData.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="tag-chip-remove">×</button>
              </span>
            ))}
            <input
              className="tag-input-field"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder={formData.tags.length === 0 ? 'Array, String, Math...' : ''}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label>Input Format (Bangla)</label>
            <input
              name="input_format_bn"
              value={formData.input_format_bn}
              onChange={handleChange}
              placeholder="ইনপুট মেথড এখানে লিখুন"
            />
          </div>
          <div className="input-group">
            <label>Output Format (Bangla)</label>
            <input
              name="output_format_bn"
              value={formData.output_format_bn}
              onChange={handleChange}
              placeholder="আউটপুট মেথড এখানে লিখুন"
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label>Global Sample Input (Shown in UI)</label>
            <input
              name="sample_input"
              value={formData.sample_input}
              onChange={handleChange}
              placeholder="Sample Input string"
            />
          </div>
          <div className="input-group">
            <label>Global Sample Output (Shown in UI)</label>
            <input
              name="sample_output"
              value={formData.sample_output}
              onChange={handleChange}
              placeholder="Expected Output string"
            />
          </div>
        </div>

        <div className="test-cases-section">
          <div className="v2-block-header">
            <h3>Evaluation Test Cases</h3>
            <button type="button" className="btn-edit" onClick={addTestCase} style={{ marginLeft: 'auto' }}>
              <Plus size={16} /> Add Test Case
            </button>
          </div>

          {formData.test_cases.map((tc, index) => (
            <div key={index} className="test-case-row animate-in">
              <div className="input-group">
                <label>Input</label>
                <textarea
                  value={tc.input}
                  onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                  style={{ minHeight: '60px' }}
                />
              </div>
              <div className="input-group">
                <label>Expected Output</label>
                <textarea
                  value={tc.expected_output}
                  onChange={(e) => handleTestCaseChange(index, 'expected_output', e.target.value)}
                  style={{ minHeight: '60px' }}
                />
              </div>
              <div className="checkbox-group">
                <label>Is Sample?</label>
                <input
                  type="checkbox"
                  checked={tc.is_sample}
                  onChange={(e) => handleTestCaseChange(index, 'is_sample', e.target.checked)}
                />
              </div>
              <button type="button" className="btn-remove-tc" onClick={() => removeTestCase(index)}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/manage')}>
            <X size={18} /> Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Save size={18} /> {loading ? 'Saving...' : (isEdit ? 'Update Problem' : 'Create Problem')}
          </button>
        </div>
      </form >
    </div >
  );
};

export default CreateProblem;
