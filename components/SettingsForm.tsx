import React, { useState, useEffect } from 'react';
import type { WebsiteProfile } from '../types';

interface SettingsFormProps {
  profiles: WebsiteProfile[];
  selectedProfile: WebsiteProfile | null;
  onProfileSelect: (id: string | null) => void;
  onProfileSave: (profile: Omit<WebsiteProfile, 'id'> & { id?: string }) => void;
  onProfileDelete: (id: string) => void;
}

const BLANK_FORM_STATE = {
    profileName: '',
    companyName: '',
    founderName: '',
    companyLogoUrl: '',
};

const SettingsForm: React.FC<SettingsFormProps> = ({ profiles, selectedProfile, onProfileSelect, onProfileSave, onProfileDelete }) => {
  const [formData, setFormData] = useState(selectedProfile ? { ...selectedProfile } : BLANK_FORM_STATE);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (selectedProfile) {
      setFormData({ ...selectedProfile });
    } else {
      setFormData(BLANK_FORM_STATE);
    }
    setShowDeleteConfirm(false);
    setIsSaved(false);
  }, [selectedProfile]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setIsSaved(false);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    onProfileSelect(value === 'new' ? null : value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    if (!formData.profileName) {
      // Basic validation
      alert('Profile Name is required.');
      return;
    }
    console.log('Calling onProfileSave with:', formData);
    onProfileSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleDelete = () => {
    if (selectedProfile) {
        onProfileDelete(selectedProfile.id);
    }
    setShowDeleteConfirm(false);
  };

  return (
    <details className="mb-8 card premium-hover">
      <summary className="p-6 cursor-pointer font-semibold text-slate-700 dark:text-text-secondary select-none list-inside hover:text-brand-600 dark:hover:text-brand-400 transition-colors duration-300">
        Manage Website Profiles
      </summary>
      <div className="p-6 border-t border-slate-200/50 dark:border-base-300/50 bg-gradient-to-br from-slate-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm">
        <p className="text-sm text-slate-500 dark:text-text-secondary mb-4">
          Create and select profiles to auto-fill fields like <code>publisher</code>, <code>organization</code>, and <code>author</code>. Profiles are saved in your browser.
        </p>

        <div className="mb-6">
            <label htmlFor="profile-select" className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                Active Profile
            </label>
            <select 
                id="profile-select" 
                onChange={handleSelectChange} 
                value={selectedProfile?.id ?? 'new'}
                className="input-field w-full"
            >
                <option value="new">+ Create New Profile</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.profileName}</option>)}
            </select>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
              <label htmlFor="profileName" className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                Profile Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="profileName"
                name="profileName"
                value={formData.profileName}
                onChange={handleChange}
                placeholder="e.g., My Personal Blog"
                className="input-field w-full"
                required
              />
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g., Paretoid Marketing LLP"
                className="input-field w-full"
              />
            </div>
            <div>
              <label htmlFor="founderName" className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                Founder / Main Author Name
              </label>
              <input
                type="text"
                id="founderName"
                name="founderName"
                value={formData.founderName}
                onChange={handleChange}
                placeholder="e.g., John Doe"
                className="input-field w-full"
              />
            </div>
          </div>
           <div>
            <label htmlFor="companyLogoUrl" className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
              Company Logo URL (full URL)
            </label>
            <input
              type="url"
              id="companyLogoUrl"
              name="companyLogoUrl"
              value={formData.companyLogoUrl}
              onChange={handleChange}
              placeholder="e.g., https://example.com/logo.png"
              className="input-field w-full"
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            {selectedProfile && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors duration-200"
              >
                Delete
              </button>
            )}

            <button
                type="submit"
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isSaved}
            >
                {isSaved ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <span>{selectedProfile ? 'Save Changes' : 'Save New Profile'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </>
                )}
            </button>
          </div>
        </form>

         {showDeleteConfirm && selectedProfile && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                    Are you sure you want to delete the profile "{selectedProfile.profileName}"?
                </p>
                <div className="mt-3 flex justify-end gap-2">
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1 text-sm rounded-md hover:bg-slate-200 dark:hover:bg-base-300">
                        Cancel
                    </button>
                    <button onClick={handleDelete} className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md">
                        Confirm Delete
                    </button>
                </div>
            </div>
        )}
      </div>
    </details>
  );
};

export default SettingsForm;