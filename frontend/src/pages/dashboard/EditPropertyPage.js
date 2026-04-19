import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  FiChevronRight, FiChevronLeft, FiUpload, FiX, FiCheck,
  FiSave, FiImage, FiMapPin, FiHome, FiDollarSign, FiGrid,
  FiPlayCircle, FiTrash2, FiStar, FiArrowLeft,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { propertyService } from '../../services/properties';
import {
  PROPERTY_TYPES, LISTING_TYPES, CITIES, ADDIS_ABABA_SUB_CITIES, AMENITIES,
  HALL_AMENITIES, MAX_IMAGES_PER_PROPERTY, ACCEPTED_IMAGE_TYPES,
} from '../../utils/constants';
import {
  validateImageFile, getImageUrl, getErrorMessage,
  propertyTypeFormFromApi, isHallPropertyType,
} from '../../utils/helpers';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, label: 'Basic Info', icon: FiHome },
  { id: 2, label: 'Location', icon: FiMapPin },
  { id: 3, label: 'Amenities', icon: FiGrid },
  { id: 4, label: 'Pricing', icon: FiDollarSign },
  { id: 5, label: 'Media', icon: FiImage },
  { id: 6, label: 'Review', icon: FiCheck },
];

function ProgressBar({ currentStep, steps }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-green-600 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step) => (
          <div key={step.id} className="relative flex flex-col items-center z-10">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step.id < currentStep
                  ? 'bg-green-600 text-white'
                  : step.id === currentStep
                    ? 'bg-green-600 text-white ring-4 ring-green-100'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.id < currentStep ? <FiCheck className="w-4 h-4" /> : step.id}
            </div>
            <span className={`text-xs mt-2 font-medium hidden sm:block ${
              step.id <= currentStep ? 'text-green-700' : 'text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EditPropertyPage() {
  const { slug } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [deletingImage, setDeletingImage] = useState(null);
  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const fileInputRef = useRef(null);

  const {
    register, handleSubmit, control, watch, trigger, reset, getValues,
    formState: { errors },
  } = useForm();

  const propertyType = watch('propertyType');
  const listingType = watch('listingType');
  const city = watch('city');
  const isHall = isHallPropertyType(propertyType);

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const data = await propertyService.getPropertyBySlug(slug);
        const property = data.property || data;

        reset({
          title: property.title || '',
          description: property.description || '',
          propertyType: propertyTypeFormFromApi(property.property_type || property.propertyType),
          bedrooms: property.bedrooms || '',
          bathrooms: property.bathrooms || '',
          area: property.area || '',
          city: property.location?.city || '',
          subCity: property.location?.subCity || '',
          specificLocation: property.location?.specificLocation || '',
          amenities: property.amenities || [],
          hallAmenities: property.hallDetails?.amenities || [],
          monthlyRent: property.price || '',
          hourlyRate: property.hallDetails?.hourlyRate || '',
          dailyRate: property.hallDetails?.dailyRate || '',
          capacity: property.hallDetails?.capacity || property.capacity || '',
          videoUrl: property.videoUrl || '',
          listingType: property.listing_type || property.listingType || 'rent',
        });

        setExistingImages(
          (property.images || []).map((img, i) => ({
            id: img.id || img._id || `img-${i}`,
            url: typeof img === 'string' ? getImageUrl(img) : getImageUrl(img.url || img.path),
            isPrimary: img.isPrimary || i === 0,
          }))
        );

        setAvailabilityStatus(property.status || 'available');
      } catch (err) {
        toast.error('Failed to load property');
        navigate('/dashboard/landlord');
      } finally {
        setPageLoading(false);
      }
    };

    loadProperty();
  }, [slug, reset, navigate]);

  const handleNavigation = (key) => {
    const routes = {
      dashboard: '/dashboard/landlord',
      properties: '/dashboard/landlord',
      messages: '/chat',
      settings: '/profile',
    };
    if (routes[key]) navigate(routes[key]);
  };

  const validateStep = async (step) => {
    const fieldsByStep = {
      1: ['title', 'description', 'propertyType'],
      2: ['city'],
      3: [],
      4: isHall ? [] : ['monthlyRent'],
      5: [],
    };
    const fields = fieldsByStep[step];
    if (!fields || fields.length === 0) return true;
    return trigger(fields);
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 6) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleImageFiles = useCallback((files) => {
    const fileArray = Array.from(files);
    const totalImages = existingImages.length + newImages.length;
    const remaining = MAX_IMAGES_PER_PROPERTY - totalImages;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES_PER_PROPERTY} images allowed`);
      return;
    }

    const validFiles = [];
    fileArray.slice(0, remaining).forEach((file) => {
      const { valid, error } = validateImageFile(file);
      if (valid) validFiles.push(file);
      else toast.error(`${file.name}: ${error}`);
    });

    if (validFiles.length > 0) {
      setNewImages((prev) => [...prev, ...validFiles]);
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setNewImagePreviews((prev) => [...prev, { url: e.target.result, name: file.name }]);
        };
        reader.readAsDataURL(file);
      });
    }
  }, [existingImages.length, newImages.length]);

  const removeNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteExistingImage = async (imageId) => {
    setDeletingImage(imageId);
    try {
      await propertyService.deletePropertyImage(slug, imageId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('Image removed');
    } catch {
      toast.error('Failed to remove image');
    } finally {
      setDeletingImage(null);
    }
  };

  const setPrimaryImage = (imageId) => {
    setExistingImages((prev) =>
      prev.map((img) => ({ ...img, isPrimary: img.id === imageId }))
    );
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleImageFiles(e.dataTransfer.files);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const propertyData = {
        title: data.title,
        description: data.description,
        propertyType: data.propertyType,
        listing_type: data.listingType || 'rent',
        bedrooms: isHall ? undefined : (data.bedrooms ? Number(data.bedrooms) : undefined),
        bathrooms: isHall ? undefined : (data.bathrooms ? Number(data.bathrooms) : undefined),
        area: data.area ? Number(data.area) : undefined,
        status: availabilityStatus,
        location: {
          city: data.city,
          subCity: data.subCity,
          specificLocation: data.specificLocation,
        },
        amenities: data.amenities,
        price: isHall ? undefined : Number(data.monthlyRent),
        hallDetails: isHall ? {
          hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : undefined,
          dailyRate: data.dailyRate ? Number(data.dailyRate) : undefined,
          capacity: data.capacity ? Number(data.capacity) : undefined,
          amenities: data.hallAmenities,
        } : undefined,
        videoUrl: data.videoUrl || undefined,
      };

      await propertyService.updateProperty(slug, propertyData);

      if (newImages.length > 0) {
        await propertyService.uploadPropertyImages(slug, newImages);
      }

      toast.success('Property updated successfully!');
      navigate('/dashboard/landlord');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
  const errorCls = 'text-xs text-red-500 mt-1';

  if (pageLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="landlord" activeKey="properties" user={user} onNavigate={handleNavigation} onLogout={logout} />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading property..." />
        </main>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            <div>
              <label className={labelClass}>Property Title *</label>
              <input {...register('title', { required: 'Required', minLength: { value: 5, message: 'At least 5 characters' } })} className={inputClass} />
              {errors.title && <p className={errorCls}>{errors.title.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Description *</label>
              <textarea {...register('description', { required: 'Required', minLength: { value: 20, message: 'At least 20 characters' } })} rows={5} className={inputClass} />
              {errors.description && <p className={errorCls}>{errors.description.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Property Type *</label>
              <select {...register('propertyType', { required: 'Required' })} className={inputClass}>
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {errors.propertyType && <p className={errorCls}>{errors.propertyType.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Offer as</label>
              <p className="text-xs text-gray-500 mb-2">Rent, sell, or short-term listing.</p>
              <select {...register('listingType')} className={inputClass}>
                {LISTING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {!isHall && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className={labelClass}>Bedrooms</label><input {...register('bedrooms')} type="number" min="0" className={inputClass} /></div>
                <div><label className={labelClass}>Bathrooms</label><input {...register('bathrooms')} type="number" min="0" className={inputClass} /></div>
                <div><label className={labelClass}>Area (m²)</label><input {...register('area')} type="number" min="0" className={inputClass} /></div>
              </div>
            )}
            {/* Availability Status */}
            <div>
              <label className={labelClass}>Availability Status</label>
              <select
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value)}
                className={inputClass}
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Location</h2>
            <div>
              <label className={labelClass}>City *</label>
              <select {...register('city', { required: 'Required' })} className={inputClass}>
                <option value="">Select city</option>
                {CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.city && <p className={errorCls}>{errors.city.message}</p>}
            </div>
            {city === 'addis_ababa' && (
              <div>
                <label className={labelClass}>Sub-City</label>
                <select {...register('subCity')} className={inputClass}>
                  <option value="">Select sub-city</option>
                  {ADDIS_ABABA_SUB_CITIES.map((sc) => <option key={sc.value} value={sc.value}>{sc.label}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>Specific Location</label>
              <input {...register('specificLocation')} className={inputClass} placeholder="e.g., Near Edna Mall" />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Amenities</h2>
            <Controller
              name="amenities"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {AMENITIES.map((amenity) => {
                    const isSelected = field.value?.includes(amenity.value);
                    return (
                      <button key={amenity.value} type="button"
                        onClick={() => field.onChange(isSelected ? field.value.filter((v) => v !== amenity.value) : [...(field.value || []), amenity.value])}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${isSelected ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        <FiCheck className={`w-4 h-4 ${isSelected ? 'text-green-600' : 'text-transparent'}`} />
                        {amenity.label}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {isHall && (
              <>
                <h3 className="text-base font-semibold text-gray-900 mt-6">Hall Amenities</h3>
                <Controller
                  name="hallAmenities"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {HALL_AMENITIES.map((amenity) => {
                        const isSelected = field.value?.includes(amenity.value);
                        return (
                          <button key={amenity.value} type="button"
                            onClick={() => field.onChange(isSelected ? field.value.filter((v) => v !== amenity.value) : [...(field.value || []), amenity.value])}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${isSelected ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                          >
                            <FiCheck className={`w-4 h-4 ${isSelected ? 'text-green-600' : 'text-transparent'}`} />
                            {amenity.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Pricing</h2>
            {!isHall ? (
              <div>
                <label className={labelClass}>
                  {listingType === 'sale'
                    ? 'Total price (ETB) *'
                    : listingType === 'short_term'
                      ? 'Monthly rate — short-term (ETB) *'
                      : 'Monthly rent (ETB) *'}
                </label>
                <input {...register('monthlyRent', { required: !isHall && 'Required', min: { value: 1, message: 'Must be positive' } })} type="number" className={inputClass} />
                {errors.monthlyRent && <p className={errorCls}>{errors.monthlyRent.message}</p>}
              </div>
            ) : (
              <>
                <div><label className={labelClass}>Hourly Rate (ETB)</label><input {...register('hourlyRate')} type="number" className={inputClass} /></div>
                <div><label className={labelClass}>Daily Rate (ETB)</label><input {...register('dailyRate')} type="number" className={inputClass} /></div>
                <div><label className={labelClass}>Capacity</label><input {...register('capacity')} type="number" className={inputClass} /></div>
              </>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">Media</h2>
            <p className="text-sm text-gray-500">
              Add up to {MAX_IMAGES_PER_PROPERTY} photos total (existing + new).
            </p>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Current Images ({existingImages.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {existingImages.map((img) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(img.id)}
                          className="p-2 bg-white rounded-full text-yellow-500 hover:bg-yellow-50"
                          title="Set as primary"
                        >
                          <FiStar className={`w-4 h-4 ${img.isPrimary ? 'fill-yellow-500' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteExistingImage(img.id)}
                          disabled={deletingImage === img.id}
                          className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingImage === img.id ? (
                            <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                          ) : (
                            <FiTrash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {img.isPrimary && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-medium">Primary</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'
              }`}
            >
              <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={(e) => handleImageFiles(e.target.files)} className="hidden" />
              <FiUpload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Drop new images here or click to browse</p>
            </div>

            {newImagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {newImagePreviews.map((preview, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
                    <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeNewImage(i)} className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">New</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className={labelClass}>Video URL (optional)</label>
              <input {...register('videoUrl')} className={inputClass} placeholder="https://youtube.com/watch?v=..." />
            </div>
          </div>
        );

      case 6: {
        const values = getValues();
        const selectedType = PROPERTY_TYPES.find((t) => t.value === values.propertyType);
        const selectedCity = CITIES.find((c) => c.value === values.city);
        const lt = (values.listingType || 'rent').toString().toLowerCase();
        const priceReviewSuffix = lt === 'sale'
          ? 'Total price'
          : lt === 'short_term'
            ? 'ETB/mo (short-term)'
            : 'ETB/mo';

        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Review Changes</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm text-yellow-800">
                Review your changes before updating. Status: <strong className="capitalize">{availabilityStatus}</strong>
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Title:</span> <span className="font-medium text-gray-800">{values.title}</span></div>
                <div><span className="text-gray-400">Type:</span> <span className="font-medium text-gray-800">{selectedType?.label}</span></div>
                <div><span className="text-gray-400">City:</span> <span className="font-medium text-gray-800">{selectedCity?.label}</span></div>
                <div><span className="text-gray-400">Price:</span> <span className="font-medium text-gray-800">{isHall ? `${values.dailyRate || values.hourlyRate || 0} ETB` : `${values.monthlyRent} ${priceReviewSuffix}`}</span></div>
                <div><span className="text-gray-400">Images:</span> <span className="font-medium text-gray-800">{existingImages.length} existing + {newImages.length} new</span></div>
                <div><span className="text-gray-400">Status:</span> <span className="font-medium text-gray-800 capitalize">{availabilityStatus}</span></div>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="landlord" activeKey="properties" user={user} onNavigate={handleNavigation} onLogout={logout} />

      <main className="flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button
            onClick={() => navigate('/dashboard/landlord')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Property</h1>
          <p className="text-sm text-gray-500 mb-6">Step {currentStep} of {STEPS.length}</p>

          <ProgressBar currentStep={currentStep} steps={STEPS} />

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
              {renderStep()}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button" onClick={prevStep} disabled={currentStep === 1}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <FiChevronLeft className="w-4 h-4" /> Previous
              </button>

              {currentStep < 6 ? (
                <button type="button" onClick={nextStep}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-700 rounded-xl hover:bg-green-800 transition-colors">
                  Next <FiChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors">
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating...</>
                  ) : (
                    <><FiCheck className="w-4 h-4" /> Update Property</>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
