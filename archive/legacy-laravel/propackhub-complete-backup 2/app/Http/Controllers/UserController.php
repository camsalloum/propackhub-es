<?php

namespace App\Http\Controllers;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\View\View;
use App\Models\User;
use App\Models\Feedback;
use App\Mail\UserStatusApprovedMail;
use Illuminate\Support\Facades\Mail;
use App\Mail\AdminFeedbackMail;



class UserController extends Controller
{
    public function index()
    {
        $users = User::where('user_type', 'user')->get();
        return view('users.index', compact('users'));
    }

    public function destroy(User $user)
    {
        $user->delete();
        return redirect()->route('users.index')->with('success', 'User deleted successfully.');
    }

    public function edit(User $user)
    {
        return view('users.edit', compact('user'));
    }

    public function updateStatus(Request $request, User $user)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:approve,reject']
        ]);

        $status = $validated['status'] === 'approve' ? 'approve' : 'reject';
        $user->update(['user_status' => $status]);

        if ($status === 'approve') {
            Mail::to($user->email)->send(new UserStatusApprovedMail($user));
        }

        return response()->json(['message' => "User status updated to {$status}."]);
    }

    public function show($id)
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        
        // Validate the input fields
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'password' => 'nullable|min:8',
            'company_name' => 'nullable|string|max:255',
            'full_job_title' => 'nullable|string|max:255',
            'company_type' => 'nullable|string|max:255',
            'company_website' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'user_level' => 'required',
        ]);

        // Find the user
        $user = User::findOrFail($id);
        $company_type = $request->company_type === 'Other' ? $request->other_company_type : $request->company_type;
        // Update user fields
        $user->name = $validatedData['name'];
        $user->email = $validatedData['email'];
        $user->company_name = $validatedData['company_name'] ?? $user->company_name;
        $user->full_job_title = $validatedData['full_job_title'] ?? $user->full_job_title;
        $user->company_type = $company_type;
        $user->company_website = $validatedData['company_website'] ?? $user->company_website;
        $user->country = $validatedData['country'] ?? $user->country;
        $user->user_level = $validatedData['user_level'] ?? $user->user_level;

        // Update password if provided
        if (!empty($validatedData['password'])) {
            $user->password = Hash::make($validatedData['password']);
        }

        // Save the updated user
        $user->save();

        // Redirect with success message
        return redirect()->route('users.index')->with('success', 'User updated successfully!');
    }

    public function feedbackStore(Request $request)
    {
        $request->validate([
            'feedback' => 'required|string|min:5|max:1000',
        ]);

        $feedback = Feedback::create([
            'user_id' => Auth::id(),
            'feedback' => $request->input('feedback'),
        ]);

        // Send email to admin
        Mail::to('main@propackhub.com')->send(new AdminFeedbackMail($feedback));

        return redirect()->back()->with('success', 'Your feedback has been submitted successfully.');
    }
} 

