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
    <div className="mb-8">
      {/* Profile Selection - Outside Accordion */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-600 mb-4 text-center">
          Active Profile ({profiles.length} profiles)
        </label>
        
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Existing Profile Logos */}
          {profiles.map(p => (
            <div key={p.id} className="relative group">
              <button
                onClick={() => onProfileSelect(p.id)}
                className={`relative p-1 rounded-lg transition-all duration-200 ${
                  selectedProfile?.id === p.id 
                    ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white' 
                    : 'hover:ring-2 hover:ring-slate-300'
                }`}
                title={`${p.profileName}${p.companyName ? ` • ${p.companyName}` : ''}`}
              >
                <div className={`h-12 rounded-lg flex items-center justify-center overflow-hidden px-2 ${
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
                  <div className={`h-12 w-12 flex items-center justify-center font-semibold text-base ${p.companyLogoUrl ? 'hidden' : ''} ${
                    p.isLightLogo ? 'text-white' : 'text-slate-500'
                  }`}>
                    {p.companyName ? p.companyName.charAt(0).toUpperCase() : p.profileName.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                {/* Active indicator */}
                {selectedProfile?.id === p.id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                title={`Edit ${p.profileName}`}
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                title={`Delete ${p.profileName}`}
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          
          {/* Create New Profile Card */}
          <button
            onClick={handleCreateNew}
            className="group p-1 rounded-lg hover:ring-2 hover:ring-brand-300 transition-all duration-200"
            title="Create New Profile"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform duration-200">
              +
            </div>
          </button>
        </div>
      </div>


    {/* Create New Profile Modal */}
    {showCreateModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                {isEditing ? 'Edit Profile' : 'Create New Profile'}
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

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label htmlFor="modal-profileName" className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                  Profile Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="modal-profileName"
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
                  <label htmlFor="modal-companyName" className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="modal-companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g., Paretoid Marketing LLP"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label htmlFor="modal-founderName" className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                    Founder / Main Author Name
                  </label>
                  <input
                    type="text"
                    id="modal-founderName"
                    name="founderName"
                    value={formData.founderName}
                    onChange={handleChange}
                    placeholder="e.g., John Doe"
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="modal-companyLogoUrl" className="block text-sm font-medium text-slate-600 dark:text-text-secondary mb-1">
                  Company Logo URL (full URL)
                </label>
                <input
                  type="url"
                  id="modal-companyLogoUrl"
                  name="companyLogoUrl"
                  value={formData.companyLogoUrl}
                  onChange={handleChange}
                  placeholder="e.g., https://example.com/logo.png"
                  className="input-field w-full"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="modal-isLightLogo"
                  name="isLightLogo"
                  checked={formData.isLightLogo || false}
                  onChange={handleChange}
                  className="w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 focus:ring-2"
                />
                <label htmlFor="modal-isLightLogo" className="text-sm font-medium text-slate-600 dark:text-text-secondary">
                  Logo is light colored (needs dark background)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600  hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {isEditing ? 'Save Changes' : 'Create Profile'}
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