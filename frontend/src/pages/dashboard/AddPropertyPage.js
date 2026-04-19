import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  FiChevronRight, FiChevronLeft, FiUpload, FiX, FiCheck,
  FiSave, FiImage, FiMapPin, FiHome, FiDollarSign, FiGrid,
  FiPlayCircle, FiTrash2,
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { propertyService } from '../../services/properties';
import {
  PROPERTY_TYPES, LISTING_TYPES, CITIES, ADDIS_ABABA_SUB_CITIES, AMENITIES,
  HALL_AMENITIES, MAX_IMAGES_PER_PROPERTY, ACCEPTED_IMAGE_TYPES,
} from '../../utils/constants';
import { validateImageFile, getErrorMessage, isHallPropertyType } from '../../utils/helpers';
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

export default function AddPropertyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const {
    register, handleSubmit, control, watch, setValue, trigger,
    formState: { errors },
    getValues,
  } = useForm({
    defaultValues: {
      title: '', description: '', propertyType: '', bedrooms: '', bathrooms: '',
      area: '', city: '', subCity: '', specificLocation: '', amenities: [], hallAmenities: [], monthlyRent: '',
      hourlyRate: '', dailyRate: '', capacity: '', videoUrl: '',
      listingType: 'rent',
    },
  });

  const propertyType = watch('propertyType');
  const listingType = watch('listingType');
  const city = watch('city');
  const isHall = isHallPropertyType(propertyType);

  const handleNavigation = (key) => {
    const routes = {
      dashboard: '/dashboard/landlord',
      properties: '/dashboard/landlord',
      'add-property': '/dashboard/landlord/add-property',
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
    const remaining = MAX_IMAGES_PER_PROPERTY - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES_PER_PROPERTY} images allowed`);
      return;
    }

    const validFiles = [];
    fileArray.slice(0, remaining).forEach((file) => {
      const { valid, error } = validateImageFile(file);
      if (valid) {
        validFiles.push(file);
      } else {
        toast.error(`${file.name}: ${error}`);
      }
    });

    if (validFiles.length > 0) {
      setImages((prev) => [...prev, ...validFiles]);
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews((prev) => [...prev, { url: e.target.result, name: file.name }]);
        };
        reader.readAsDataURL(file);
      });
    }
  }, [images.length]);

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleImageFiles(e.dataTransfer.files);
    }
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const data = getValues();
      localStorage.setItem('betrent_property_draft', JSON.stringify(data));
      toast.success('Draft saved locally');
    } catch {
      toast.error('Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
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

      const result = await propertyService.createProperty(propertyData);
      const created = result.property || result;
      const propertySlug = created.slug;

      if (images.length > 0 && propertySlug) {
        await propertyService.uploadPropertyImages(propertySlug, images);
      }

      localStorage.removeItem('betrent_property_draft');
      toast.success('Property created successfully!');
      navigate('/dashboard/landlord');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';
  const errorClass = 'text-xs text-red-500 mt-1';

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Basic Information</h2>
            <p className="text-sm text-gray-500 mb-6">Tell us about your property.</p>

            <div>
              <label className={labelClass}>Property Title *</label>
              <input
                {...register('title', { required: 'Title is required', minLength: { value: 5, message: 'At least 5 characters' } })}
                className={inputClass}
                placeholder="e.g., Modern 2-Bedroom Apartment in Bole"
              />
              {errors.title && <p className={errorClass}>{errors.title.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Description *</label>
              <textarea
                {...register('description', { required: 'Description is required', minLength: { value: 20, message: 'At least 20 characters' } })}
                rows={5}
                className={inputClass}
                placeholder="Describe your property in detail..."
              />
              {errors.description && <p className={errorClass}>{errors.description.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Property Type *</label>
              <select
                {...register('propertyType', { required: 'Select a property type' })}
                className={inputClass}
              >
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.propertyType && <p className={errorClass}>{errors.propertyType.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Offer as *</label>
              <p className="text-xs text-gray-500 mb-2">Choose whether you are renting out the property or selling it.</p>
              <select {...register('listingType')} className={inputClass}>
                {LISTING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {!isHall && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Bedrooms</label>
                  <input {...register('bedrooms')} type="number" min="0" className={inputClass} placeholder="0" />
                </div>
                <div>
                  <label className={labelClass}>Bathrooms</label>
                  <input {...register('bathrooms')} type="number" min="0" className={inputClass} placeholder="0" />
                </div>
                <div>
                  <label className={labelClass}>Area (m²)</label>
                  <input {...register('area')} type="number" min="0" className={inputClass} placeholder="0" />
                </div>
              </div>
            )}

            {isHall && (
              <div>
                <label className={labelClass}>Capacity (people)</label>
                <input {...register('capacity')} type="number" min="0" className={inputClass} placeholder="e.g., 500" />
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Location</h2>
            <p className="text-sm text-gray-500 mb-6">Where is your property located?</p>

            <div>
              <label className={labelClass}>City *</label>
              <select {...register('city', { required: 'City is required' })} className={inputClass}>
                <option value="">Select city</option>
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.city && <p className={errorClass}>{errors.city.message}</p>}
            </div>

            {city === 'addis_ababa' && (
              <div>
                <label className={labelClass}>Sub-City</label>
                <select {...register('subCity')} className={inputClass}>
                  <option value="">Select sub-city</option>
                  {ADDIS_ABABA_SUB_CITIES.map((sc) => (
                    <option key={sc.value} value={sc.value}>{sc.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>Specific Location</label>
              <input
                {...register('specificLocation')}
                className={inputClass}
                placeholder="e.g., Near Edna Mall, Behind Friendship Hotel"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Amenities</h2>
            <p className="text-sm text-gray-500 mb-6">Select the amenities your property offers.</p>

            <Controller
              name="amenities"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {AMENITIES.map((amenity) => {
                    const isSelected = field.value.includes(amenity.value);
                    return (
                      <button
                        key={amenity.value}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? field.value.filter((v) => v !== amenity.value)
                            : [...field.value, amenity.value];
                          field.onChange(next);
                        }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                          isSelected
                            ? 'bg-green-50 border-green-500 text-green-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <FiCheck className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-green-600' : 'text-transparent'}`} />
                        {amenity.label}
                      </button>
                    );
                  })}
                </div>
              )}
            />

            {isHall && (
              <>
                <h3 className="text-base font-semibold text-gray-900 mt-8 mb-4">Hall-Specific Amenities</h3>
                <Controller
                  name="hallAmenities"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {HALL_AMENITIES.map((amenity) => {
                        const isSelected = field.value.includes(amenity.value);
                        return (
                          <button
                            key={amenity.value}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? field.value.filter((v) => v !== amenity.value)
                                : [...field.value, amenity.value];
                              field.onChange(next);
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                              isSelected
                                ? 'bg-green-50 border-green-500 text-green-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <FiCheck className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-green-600' : 'text-transparent'}`} />
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Pricing</h2>
            <p className="text-sm text-gray-500 mb-6">
              {listingType === 'sale'
                ? 'Enter the total sale price. Buyers pay this amount to own the property, not a monthly rent.'
                : 'Set the price for your property.'}
            </p>

            {!isHall ? (
              <div>
                <label className={labelClass}>
                  {listingType === 'sale'
                    ? 'Total price (ETB) *'
                    : listingType === 'short_term'
                      ? 'Monthly rate — short-term (ETB) *'
                      : 'Monthly rent (ETB) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ETB</span>
                  <input
                    {...register('monthlyRent', { required: !isHall && 'Price is required', min: { value: 1, message: 'Must be positive' } })}
                    type="number"
                    className={`${inputClass} pl-14`}
                    placeholder={listingType === 'sale' ? 'e.g., 15,000,000' : '10,000'}
                  />
                </div>
                {errors.monthlyRent && <p className={errorClass}>{errors.monthlyRent.message}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Hourly Rate (ETB)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ETB</span>
                    <input
                      {...register('hourlyRate')}
                      type="number"
                      className={`${inputClass} pl-14`}
                      placeholder="5,000"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Daily Rate (ETB)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ETB</span>
                    <input
                      {...register('dailyRate')}
                      type="number"
                      className={`${inputClass} pl-14`}
                      placeholder="30,000"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Capacity (people)</label>
                  <input
                    {...register('capacity')}
                    type="number"
                    min="0"
                    className={inputClass}
                    placeholder="e.g., 500"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Media</h2>
            <p className="text-sm text-gray-500 mb-6">
              Upload multiple photos of your property (up to {MAX_IMAGES_PER_PROPERTY}; {images.length} selected).
            </p>

            {/* Drag & Drop Upload */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={(e) => handleImageFiles(e.target.files)}
                className="hidden"
              />
              <FiUpload className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-green-500' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-700 mb-1">
                {dragActive ? 'Drop images here' : 'Drag & drop images here, or click to browse'}
              </p>
              <p className="text-xs text-gray-400">JPEG, PNG, WebP up to 5MB each</p>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {i === 0 && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-medium">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className={labelClass}>Video URL (optional)</label>
              <div className="relative">
                <FiPlayCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  {...register('videoUrl')}
                  className={`${inputClass} pl-12`}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>
          </div>
        );

      case 6: {
        const values = getValues();
        const selectedAmenities = AMENITIES.filter((a) => values.amenities?.includes(a.value));
        const selectedHallAmenities = HALL_AMENITIES.filter((a) => values.hallAmenities?.includes(a.value));
        const selectedCity = CITIES.find((c) => c.value === values.city);
        const selectedSubCity = ADDIS_ABABA_SUB_CITIES.find((sc) => sc.value === values.subCity);
        const selectedType = PROPERTY_TYPES.find((t) => t.value === values.propertyType);
        const selectedListing = LISTING_TYPES.find((t) => t.value === values.listingType);
        const priceReviewLabel = values.listingType === 'sale'
          ? 'Total price'
          : values.listingType === 'short_term'
            ? 'Short-term monthly rate'
            : 'Monthly rent';

        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Review & Submit</h2>
            <p className="text-sm text-gray-500 mb-6">Review your property details before submitting.</p>

            {[
              {
                title: 'Basic Info', items: [
                  { label: 'Title', value: values.title },
                  { label: 'Type', value: selectedType?.label },
                  { label: 'Offer', value: selectedListing?.label || values.listingType },
                  { label: 'Description', value: values.description?.slice(0, 100) + (values.description?.length > 100 ? '...' : '') },
                  ...(!isHall ? [
                    { label: 'Bedrooms', value: values.bedrooms },
                    { label: 'Bathrooms', value: values.bathrooms },
                    { label: 'Area', value: values.area ? `${values.area} m²` : '-' },
                  ] : [
                    { label: 'Capacity', value: values.capacity ? `${values.capacity} people` : '-' },
                  ]),
                ],
              },
              {
                title: 'Location', items: [
                  { label: 'City', value: selectedCity?.label || values.city },
                  { label: 'Sub-City', value: selectedSubCity?.label || values.subCity || '-' },
                  { label: 'Specific Location', value: values.specificLocation || '-' },
                ],
              },
              {
                title: 'Pricing', items: isHall ? [
                  { label: 'Hourly Rate', value: values.hourlyRate ? `${values.hourlyRate} ETB` : '-' },
                  { label: 'Daily Rate', value: values.dailyRate ? `${values.dailyRate} ETB` : '-' },
                ] : [
                  { label: priceReviewLabel, value: values.monthlyRent ? `${values.monthlyRent} ETB` : '-' },
                ],
              },
            ].map((section) => (
              <div key={section.title} className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{section.title}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {section.items.map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm text-gray-800 font-medium">{item.value || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {selectedAmenities.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAmenities.map((a) => (
                    <span key={a.value} className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      {a.label}
                    </span>
                  ))}
                  {selectedHallAmenities.map((a) => (
                    <span key={a.value} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      {a.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {imagePreviews.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Images ({imagePreviews.length})</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {imagePreviews.map((preview, i) => (
                    <img key={i} src={preview.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role="landlord"
        activeKey="add-property"
        user={user}
        onNavigate={handleNavigation}
        onLogout={logout}
      />

      <main className="flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
              <p className="text-sm text-gray-500 mt-1">Step {currentStep} of {STEPS.length}</p>
            </div>
            <button
              onClick={saveDraft}
              disabled={savingDraft}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <FiSave className="w-4 h-4" />
              {savingDraft ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          <ProgressBar currentStep={currentStep} steps={STEPS} />

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
              {renderStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft className="w-4 h-4" /> Previous
              </button>

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-700 rounded-xl hover:bg-green-800 transition-colors"
                >
                  Next <FiChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-700 rounded-xl hover:bg-green-800 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" /> Publish Property
                    </>
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
