import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import GlassCard from '../components/GlassCard';

const Profile = () => {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [profile, setProfile] = useState({
    fullName: '',
    age: '',
    gender: 'Select Gender',
    state: 'Select State',
    district: '',
    occupation: '',
    annualIncome: '',
    landholding: '',
    category: 'Select Category',
    phone: ''
  });

  const states = [
    "Select State", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
    "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];

  useEffect(() => {
    const savedProfile = localStorage.getItem('schemeSaarthiProfile');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Failed to parse saved profile");
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setIsSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('schemeSaarthiProfile', JSON.stringify(profile));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };



  const formClasses = "w-full bg-white/50 backdrop-blur-sm border border-indigo-100 text-slate-800 placeholder-slate-400 px-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all appearance-none shadow-sm";
  const labelClasses = "block text-sm font-semibold text-slate-700 mb-1.5 ml-1";

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <UserCircleIcon className="w-12 h-12 text-indigo-600 drop-shadow-sm" />
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Your Profile</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Save your details to quickly check eligibility for schemes.
            <br className="md:hidden" /> <span className="text-xs opacity-75 font-semibold text-indigo-600/80">🔒 Your data is stored locally on this device.</span>
          </p>
        </div>
      </div>

      <GlassCard className="p-6 md:p-8">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Full Name */}
            <div>
              <label className={labelClasses}>Full Name</label>
              <input type="text" name="fullName" value={profile.fullName} onChange={handleChange} className={formClasses} placeholder="Rahul Sharma" required />
            </div>

            {/* Phone Number */}
            <div>
              <label className={labelClasses}>Phone Number</label>
              <input type="tel" name="phone" value={profile.phone} onChange={handleChange} className={formClasses} placeholder="+91 98XXX XXXXX" />
            </div>

            {/* Age */}
            <div>
              <label className={labelClasses}>Age</label>
              <input type="number" name="age" value={profile.age} onChange={handleChange} className={formClasses} placeholder="35" required min="18" max="120" />
            </div>

            {/* Gender */}
            <div>
              <label className={labelClasses}>Gender</label>
              <select name="gender" value={profile.gender} onChange={handleChange} className={`${formClasses} [&>option]:text-black`}>
                <option disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className={labelClasses}>State</label>
              <select name="state" value={profile.state} onChange={handleChange} className={`${formClasses} [&>option]:text-black`}>
                {states.map(s => <option key={s} value={s} disabled={s === "Select State"}>{s}</option>)}
              </select>
            </div>

            {/* District */}
            <div>
              <label className={labelClasses}>District</label>
              <input type="text" name="district" value={profile.district} onChange={handleChange} className={formClasses} placeholder="e.g. Pune" />
            </div>

            {/* Occupation */}
            <div>
              <label className={labelClasses}>Occupation</label>
              <input type="text" name="occupation" value={profile.occupation} onChange={handleChange} className={formClasses} placeholder="e.g. Farmer, Student, Artisan" />
            </div>

            {/* Annual Income */}
            <div>
              <label className={labelClasses}>Annual Income (₹)</label>
              <input type="number" name="annualIncome" value={profile.annualIncome} onChange={handleChange} className={formClasses} placeholder="250000" />
            </div>

            {/* Category */}
            <div>
              <label className={labelClasses}>Category</label>
              <select name="category" value={profile.category} onChange={handleChange} className={`${formClasses} [&>option]:text-black`}>
                <option disabled>Select Category</option>
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
            </div>

            {/* Landholding */}
            <div>
              <label className={labelClasses}>Landholding (Hectares)</label>
              <input type="number" step="0.1" name="landholding" value={profile.landholding} onChange={handleChange} className={formClasses} placeholder="1.5" />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-slate-200/60 flex flex-col md:flex-row gap-4 items-center justify-end">
            <button type="submit" className="btn-primary w-full md:w-auto">
              Save Profile
              {isSaved && <CheckCircleIcon className="w-5 h-5 text-emerald-300" />}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

export default Profile;
