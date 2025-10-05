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
    if (!formData.profileName) {
      // Basic validation
      alert('Profile Name is required.');
      return;
    }
    onProfileSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000); // Show "Saved!" for 3 seconds
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
            <label className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-3">
                Active Profile ({profiles.length} profiles)
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="profile-select"
                  value="new"
                  checked={!selectedProfile}
                  onChange={() => onProfileSelect(null)}
                  className="mr-3 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">+ Create New Profile</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Start with a fresh profile</div>
                </div>
              </label>
              {profiles.map(p => (
                <div key={p.id} className="flex items-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <label className="flex items-center flex-grow cursor-pointer">
                    <input
                      type="radio"
                      name="profile-select"
                      value={p.id}
                      checked={selectedProfile?.id === p.id}
                      onChange={() => onProfileSelect(p.id)}
                      className="mr-3 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-grow">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{p.profileName}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {p.companyName && `${p.companyName} • `}
                        {p.founderName && `by ${p.founderName}`}
                      </div>
                    </div>
                  </label>
                  <button
                    onClick={() => {
                      if (selectedProfile?.id === p.id) {
                        setShowDeleteConfirm(true);
                      } else {
                        onProfileDelete(p.id);
                      }
                    }}
                    className="ml-3 p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    aria-label={`Delete profile ${p.profileName}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
        </div>

        {isSaved && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profile saved successfully! Changes are now active.
            </p>
          </div>
        )}

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

          <div className="flex justify-end items-center pt-4">
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
                    <span>✓ Saved Successfully!</span>
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