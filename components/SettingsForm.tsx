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
    isLightLogo: false,
};

const SettingsForm: React.FC<SettingsFormProps> = ({ profiles, selectedProfile, onProfileSelect, onProfileSave, onProfileDelete }) => {
  const [formData, setFormData] = useState(BLANK_FORM_STATE);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
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

  const handleCreateNew = () => {
    setFormData(BLANK_FORM_STATE);
    setIsEditing(false);
    setShowCreateModal(true);
    setIsSaved(false);
  };

  const handleEditProfile = (profile: WebsiteProfile) => {
    setFormData({ ...profile });
    setIsEditing(true);
    setShowCreateModal(true);
    setIsSaved(false);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.profileName) {
      alert('Profile Name is required.');
      return;
    }
    onProfileSave(formData);
    setIsSaved(true);
    setShowCreateModal(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setFormData(BLANK_FORM_STATE);
    setIsEditing(false);
  };

  return (
    <div className="mb-6 sm:mb-8">
      {/* Profile Selection - Outside Accordion */}
      <div className="mb-4 sm:mb-6">
        {profiles.length === 0 ? (
          <div className="text-center py-3 sm:py-4">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 mb-3">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span className="text-xs sm:text-sm font-medium text-slate-700">No profiles yet</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed px-4">
              Create a profile to save your site details and speed up schema generation.
            </p>
          </div>
        ) : (
          <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-3 sm:mb-4 text-center">
            Active Profile ({profiles.length} profiles)
          </label>
        )}
        
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap px-2">
          {/* Existing Profile Logos */}
          {profiles.map(p => (
            <div key={p.id} className="relative group">
              <button
                onClick={() => onProfileSelect(p.id)}
                className={`relative p-1 rounded-lg transition-all duration-200 ${
                  selectedProfile?.id === p.id 
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' 
                    : 'hover:ring-2 hover:ring-slate-300'
                }`}
                title={`${p.profileName}${p.companyName ? ` • ${p.companyName}` : ''}`}
              >
                <div className={`h-10 sm:h-12 rounded-lg flex items-center justify-center overflow-hidden px-2 ${
                  p.isLightLogo ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {p.companyLogoUrl ? (
                    <img 
                      src={p.companyLogoUrl} 
                      alt={`${p.companyName || p.profileName} logo`}
                      className="h-full w-auto object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center font-semibold text-sm sm:text-base ${p.companyLogoUrl ? 'hidden' : ''} ${
                    p.isLightLogo ? 'text-white' : 'text-slate-500'
                  }`}>
                    {p.companyName ? p.companyName.charAt(0).toUpperCase() : p.profileName.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                {/* Active indicator */}
                {selectedProfile?.id === p.id && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
              
              {/* Edit button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditProfile(p);
                }}
                className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                title={`Edit ${p.profileName}`}
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedProfile?.id === p.id) {
                    setShowDeleteConfirm(true);
                  } else {
                    onProfileDelete(p.id);
                  }
                }}
                className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                title={`Delete ${p.profileName}`}
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          
          {/* Create New Profile Card */}
          <button
            onClick={handleCreateNew}
            className="group relative p-1 rounded-lg hover:ring-2 hover:ring-blue-300 transition-all duration-200"
            title="Create Website Profile"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl group-hover:scale-105 transition-transform duration-200 shadow-sm group-hover:shadow-md">
              +
            </div>
            {profiles.length === 0 && (
              <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs text-slate-500 font-medium">Create Profile</span>
              </div>
            )}
          </button>
        </div>
      </div>


    {/* Create New Profile Modal */}
    {showCreateModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                {isEditing ? 'Edit Website Profile' : 'Create Website Profile'}
              </h2>
              <button
                onClick={handleModalClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="modal-profileName" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                  Profile Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="modal-profileName"
                  name="profileName"
                  value={formData.profileName}
                  onChange={handleChange}
                  placeholder="e.g., My Personal Blog"
                  className="input-field w-full text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label htmlFor="modal-companyName" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="modal-companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g., Paretoid Marketing LLP"
                    className="input-field w-full text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]"
                  />
                </div>
                <div>
                  <label htmlFor="modal-founderName" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                    Founder / Main Author Name
                  </label>
                  <input
                    type="text"
                    id="modal-founderName"
                    name="founderName"
                    value={formData.founderName}
                    onChange={handleChange}
                    placeholder="e.g., John Doe"
                    className="input-field w-full text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="modal-companyLogoUrl" className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                  Company Logo URL (full URL)
                </label>
                <input
                  type="url"
                  id="modal-companyLogoUrl"
                  name="companyLogoUrl"
                  value={formData.companyLogoUrl}
                  onChange={handleChange}
                  placeholder="e.g., https://example.com/logo.png"
                  className="input-field w-full text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]"
                />
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="modal-isLightLogo"
                  name="isLightLogo"
                  checked={formData.isLightLogo || false}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-0.5 flex-shrink-0"
                />
                <label htmlFor="modal-isLightLogo" className="text-xs sm:text-sm font-medium text-slate-600 dark:text-text-secondary leading-relaxed">
                  Logo is light colored (needs dark background)
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:hover:text-slate-200 transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary w-full sm:w-auto"
                >
                  {isEditing ? 'Save Changes' : 'Create Website Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && selectedProfile && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white  rounded-xl shadow-2xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 ">
                Delete Profile
              </h2>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-600  mb-6">
              Are you sure you want to delete the profile <strong>"{selectedProfile.profileName}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600  hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default SettingsForm;