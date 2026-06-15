@extends('layouts.custom')

@section('content')

    <div class="container login-form py-5">
        <div class="form-container">
            <!-- Success Message -->
           
            <form method="POST" action="{{ route('login') }}">
                @csrf
                <div class="form-box">
                @if (session('success'))
                    <div class="success-message">
                        {{ session('success') }}
                    </div>
                @endif
                @if (session('error'))
                    <div class="error-message">
                        {{ session('error') }}
                    </div>
                @endif
                    <!-- Email Input -->
                    <div class="mb-4">
                        <label for="email" class="form-label">
                            Email Address: <span class="text-required">Required</span>
                        </label>
                        <x-text-input
                            :value="old('email')"
                            type="email"
                            class="form-control"
                            id="email"
                            name="email"
                            placeholder="Email......"
                            required />
                        <x-input-error :messages="$errors->get('email')" class="mt-2" />
                    </div>

                    <!-- Password Input -->
                    <div class="mb-4 position-relative">
                        <label for="password" class="form-label">
                            Password: <span class="text-required">Required</span>
                        </label>
                        <div class="input-group">
                            <input
                                type="password"
                                class="form-control"
                                id="password"
                                name="password"
                                placeholder="********"
                                required>
                            <button
                                type="button"
                                class="btn btn-outline-secondary pw-btn toggle-password"
                                id="togglePassword"
                                tabindex="-1">
                                <i class="fas fa-eye"></i> <span>Show</span>
                            </button>
                            <x-input-error :messages="$errors->get('password')" class="mt-2" />
                        </div>
                        @if (Route::has('password.request'))
                        <span class="info-text"><a href="{{ route('password.request') }}">Forgot Your Password?</a></span>
                        @endif
                    </div>

                    <!-- Terms Checkbox -->
                    <div class="mb-1">
                        <div class="form-check checkbox-field">
                            <input
                                class="form-check-input"
                                type="checkbox"
                                id="agreeTerms"
                                name="remember"
                                >
                            <label
                                class="form-check-label"
                                for="agreeTerms">
                                Stay logged in
                            </label>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <div class="mb-4 reg-button">
                        <button type="submit" class="btn btn-before">Log In</button>
                    </div>
                </div>
            </form>

            <div class="d-flex justify-content-center text-center" style="gap: 15px">
                <a href="{{ asset('register') }}" class="btn btn-before">Dont Have An Account?</a>
            </div>
        </div>
    </div>
@endsection
