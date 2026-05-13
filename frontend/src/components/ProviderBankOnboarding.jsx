import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, AlertCircle, Loader } from 'lucide-react';
import API from '../api';

const ProviderBankOnboarding = () => {
  const queryClient = useQueryClient();
  const [accountType, setAccountType] = useState('bank');
  const [formData, setFormData] = useState({
    account_type: 'bank',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    upi_id: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch existing bank account
  const { data: accountData, isLoading: accountLoading } = useQuery({
    queryKey: ['provider-bank-account'],
    queryFn: () => API.get('/payments/bank-accounts/my-account/'),
  });

  const account = accountData?.data?.id ? accountData.data : accountData?.data?.account;

  // Populate form if account exists
  useEffect(() => {
    if (account) {
      setFormData({
        account_type: account.account_type || 'bank',
        account_number: account.account_number || '',
        ifsc_code: account.ifsc_code || '',
        account_holder_name: account.account_holder_name || '',
        upi_id: account.upi_id || '',
      });
      setAccountType(account.account_type || 'bank');
    }
  }, [account]);

  // Submit bank account mutation
  const submitAccountMutation = useMutation({
    mutationFn: (data) => API.post('/payments/bank-accounts/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-bank-account'] });
      setSuccess(true);
      setError(null);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.error || error.response?.data?.non_field_errors?.[0] || 'Failed to save bank account';
      setError(errorMessage);
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAccountTypeChange = (type) => {
    setAccountType(type);
    setFormData((prev) => ({
      ...prev,
      account_type: type,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (accountType === 'bank') {
      if (!formData.account_number || !formData.ifsc_code || !formData.account_holder_name) {
        setError('Please fill in all bank account details');
        return;
      }
      if (formData.account_number.length < 9) {
        setError('Invalid account number');
        return;
      }
      if (formData.ifsc_code.length !== 11) {
        setError('IFSC code must be 11 characters');
        return;
      }
    } else {
      if (!formData.upi_id) {
        setError('Please enter your UPI ID');
        return;
      }
      if (!formData.upi_id.includes('@')) {
        setError('Invalid UPI ID format');
        return;
      }
    }

    submitAccountMutation.mutate(formData);
  };

  if (accountLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const isVerified = account?.verification_status === 'verified';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Bank Account Setup</h2>
            <p className="text-sm text-slate-500 mt-1">Add or update your bank details for receiving payments</p>
          </div>
          {isVerified && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">
              <Check className="w-4 h-4" />
              <span className="text-sm font-semibold">Verified</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Account Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-3">Account Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="account_type"
                value="bank"
                checked={accountType === 'bank'}
                onChange={() => handleAccountTypeChange('bank')}
                className="w-4 h-4 border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">Bank Account</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="account_type"
                value="upi"
                checked={accountType === 'upi'}
                onChange={() => handleAccountTypeChange('upi')}
                className="w-4 h-4 border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">UPI</span>
            </label>
          </div>
        </div>

        {/* Bank Account Form */}
        {accountType === 'bank' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Account Holder Name</label>
              <input
                type="text"
                name="account_holder_name"
                value={formData.account_holder_name}
                onChange={handleInputChange}
                placeholder="Full name as per bank records"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Account Number</label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleInputChange}
                placeholder="Enter your bank account number"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">IFSC Code</label>
              <input
                type="text"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleInputChange}
                placeholder="e.g., SBIN0001234"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition uppercase"
                maxLength="11"
              />
              <p className="text-xs text-slate-500 mt-1">11-character code from your bank cheque</p>
            </div>
          </div>
        )}

        {/* UPI Form */}
        {accountType === 'upi' && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">UPI ID</label>
            <input
              type="text"
              name="upi_id"
              value={formData.upi_id}
              onChange={handleInputChange}
              placeholder="yourname@bankname"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
            <p className="text-xs text-slate-500 mt-1">e.g., 9876543210@okhdfcbank or yourname@googlepay</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-rose-900">{error}</div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex gap-3">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">Bank account saved and verified successfully!</div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Your account details are encrypted and secure. Payouts will be sent within 24-48
            hours of service completion.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitAccountMutation.isPending}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitAccountMutation.isPending ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              {account ? 'Update Bank Account' : 'Save Bank Account'}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ProviderBankOnboarding;
