<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\View\View;
use Illuminate\Support\Facades\Mail;
use App\Mail\UserConfirmationMail;
use Anhskohbo\NoCaptcha\Facades\NoCaptcha;
use Illuminate\Validation\Rules\Password;
use App\Mail\AdminUserRegisteredMail;



class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): View
    {
        return view('auth.userLogin');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'company_name' => ['string', 'max:255'],
            'full_job_title' => ['string', 'max:255'],
            'country' => ['required'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'other_company_type' => ['nullable', 'string', 'max:255', 'required_if:company_type,Other'],
            'g-recaptcha-response' => 'required|captcha',
            'password' => [
                'required',
                Password::min(8) // Minimum 8 characters
                    ->letters()  // At least one letter
                    ->mixedCase() // At least one uppercase & one lowercase letter
                    ->numbers() // At least one number
                    ->symbols(), // At least one special character
            ],
        ]);

        // Assign Company Type (use "Other" if provided)
        $company_type = $request->company_type === 'Other' ? $request->other_company_type : $request->company_type;

        $user = User::create([
            'name' => $request->first_name.' '.$request->last_name,
            'company_name' => $request->company_name,
            'full_job_title' => $request->full_job_title,
            'company_type' => $company_type,
            'company_website' => $request->company_website,
            'country' => $request->country,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        event(new Registered($user));

        // Auth::login($user);
        Mail::to($user->email)->send(new UserConfirmationMail($user));

         // Send notification email to admin
         Mail::to('main@propackhub.com')->send(new AdminUserRegisteredMail($user));

        // Redirect back to login with success message
        return redirect()->route('login')->with('success', 'Your registration is completed. You will be notified once your account is approved.');
    }
}
