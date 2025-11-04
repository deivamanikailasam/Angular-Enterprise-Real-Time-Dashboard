import { Component, computed, effect, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthGuard } from '../../core/guards/auth';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginPage implements OnInit, OnDestroy {
  /**
   * ==================== FORM PROPERTIES ====================
   */

  /**
   * Reactive form group for login
   * Controls:
   * - email: User email address (required, valid email format)
   * - password: User password (required, minimum 6 characters)
   * - rememberMe: Checkbox to remember user for 30 days (optional)
   */
  loginForm!: FormGroup;

  /**
   * ==================== STATE SIGNALS ====================
   */

  /**
   * Loading state for submit button and form inputs
   * Used to disable inputs and show loading spinner during login request
   */
  isLoading = signal<boolean>(false);

  /**
   * Password visibility toggle
   * Switches between password and text input type
   */
  showPassword = signal<boolean>(false);

  /**
   * Error message to display to user
   * Null when no error, string when error occurs
   */
  loginError = signal<string | null>(null);

  /**
   * Set of field names that have been touched
   * Used to determine when to show validation errors
   * Errors only show after user has focused on field
   */
  touchedFields = signal<Set<string>>(new Set());

  /**
   * ==================== COMPUTED SIGNALS ====================
   */

  /**
   * Computed derived state - could be extended for other calculations
   * Example: isFormValid, hasErrors, etc.
   */
  readonly formState = computed(() => ({
    isValid: this.loginForm?.valid ?? false,
    isDirty: this.loginForm?.dirty ?? false,
    isPristine: this.loginForm?.pristine ?? false,
  }));

  /**
   * ==================== REACTIVE MANAGEMENT ====================
   */

  /**
   * Subject for managing subscriptions
   * Used for unsubscribe on component destroy
   */
  private destroy$ = new Subject<void>();

  /**
   * ==================== CONFIGURATION ====================
   */

  /**
   * Login timeout duration (milliseconds)
   */
  readonly LOGIN_TIMEOUT_MS = 1000;

  /**
   * Demo users for development/testing
   * Contains credentials for different roles
   */
  readonly DEMO_USERS = [
    {
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    },
    {
      email: 'user@example.com',
      password: 'password123',
      role: 'tenant-user',
    },
    {
      email: 'viewer@example.com',
      password: 'password123',
      role: 'viewer',
    },
  ];

  /**
   * Error messages mapping
   */
  readonly ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid email or password. Check demo credentials below.',
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Please enter a valid email',
    PASSWORD_REQUIRED: 'Password is required',
    PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters',
    LOGIN_FAILED: 'Login failed. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
  };

  /**
   * ==================== CONSTRUCTOR ====================
   */

  constructor(
    private authGuard: AuthGuard,
    private router: Router,
    private formBuilder: FormBuilder
  ) {
    // Redirect if already authenticated
    this.checkExistingAuthentication();
    
    // Initialize form
    this.initializeForm();

    // Effect: Disable/enable form controls based on loading state
  effect(() => {
    const loading = this.isLoading();
    if (loading) {
      this.loginForm.get('email')?.disable();
      this.loginForm.get('password')?.disable();
    } else {
      this.loginForm.get('email')?.enable();
      this.loginForm.get('password')?.enable();
    }
  });
  }

  /**
   * ==================== LIFECYCLE HOOKS ====================
   */

  /**
   * Angular lifecycle hook - runs after component initialization
   * Used for additional setup and subscriptions
   */
  ngOnInit(): void {
    this.setupFormSubscriptions();
  }

  /**
   * Angular lifecycle hook - runs before component destruction
   * Used for cleanup and unsubscribe
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ==================== INITIALIZATION METHODS ====================
   */

  /**
   * Check if user is already authenticated and redirect if needed
   * Prevents already-logged-in users from accessing login page
   */
  private checkExistingAuthentication(): void {
    if (this.authGuard.isAuthenticated$()) {
      this.router.navigate(['/dashboard/view']);
    }
  }

  /**
   * Initialize reactive form with validation rules
   * 
   * Form Structure:
   * - email: Required, valid email format
   * - password: Required, minimum 6 characters
   * - rememberMe: Optional boolean
   */
  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
        ],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
        ],
      ],
      rememberMe: [false],
    });
  }

  /**
   * Setup form subscriptions for reactive updates
   * Monitor form changes and update related state
   */
  private setupFormSubscriptions(): void {
    // Subscribe to email field changes
    this.loginForm
      .get('email')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Clear error when user starts typing
        if (this.loginError()) {
          this.loginError.set(null);
        }
      });

    // Subscribe to password field changes
    this.loginForm
      .get('password')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Clear error when user starts typing
        if (this.loginError()) {
          this.loginError.set(null);
        }
      });
  }

  /**
   * ==================== FORM SUBMISSION ====================
   */

  /**
   * Handle login form submission
   * Validates form, prevents submission if invalid
   * Calls authentication service and handles response
   * 
   * Flow:
   * 1. Validate form
   * 2. Mark all fields as touched to show errors if invalid
   * 3. Set loading state
   * 4. Call authGuard.login()
   * 5. Handle success/failure
   */
  onLogin(): void {
    // Check if form is valid
    if (!this.loginForm.valid) {
      // Mark all fields as touched to display validation errors
      this.markAllFieldsAsTouched();
      return;
    }

    // Prevent multiple submissions
    if (this.isLoading()) {
      return;
    }

    // Set loading state
    this.isLoading.set(true);
    this.loginError.set(null);

    // Extract form values
    const { email, password, rememberMe } = this.loginForm.value;

    // Simulate API call delay
    setTimeout(() => {
      this.performLogin(email, password, rememberMe);
    }, this.LOGIN_TIMEOUT_MS);
  }

  /**
   * Perform authentication with provided credentials
   * Handles both success and error cases
   * 
   * @param email - User email address
   * @param password - User password
   * @param rememberMe - Whether to remember user
   */
  private performLogin(email: string, password: string, rememberMe: boolean): void {
    try {
      // Attempt authentication via authGuard
      const result = this.authGuard.login(email, password);

      if (result.success) {
        // Store remember-me preference if checked
        if (rememberMe) {
          this.storeRememberMePreference(email);
        }

        // Log successful login
        console.log('✅ Login successful for:', email);

        // Navigate to dashboard
        this.router.navigate(['/dashboard/view']);
      } else {
        // Handle login failure
        this.handleLoginError(result.error);
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('Login error:', error);
      this.handleLoginError(this.ERROR_MESSAGES.LOGIN_FAILED);
    } finally {
      // Always reset loading state
      this.isLoading.set(false);
    }
  }

  /**
   * ==================== ERROR HANDLING ====================
   */

  /**
   * Handle login errors and display appropriate message
   * 
   * @param error - Error message to display
   */
  private handleLoginError(error?: string): void {
    const errorMessage = error || this.ERROR_MESSAGES.LOGIN_FAILED;
    this.loginError.set(errorMessage);
    console.error('❌ Login failed:', errorMessage);
  }

  /**
   * ==================== FORM INTERACTION ====================
   */

  /**
   * Toggle password visibility between text and password input types
   * Allows user to see/hide their password
   */
  togglePasswordVisibility(): void {
    this.showPassword.update(current => !current);
  }

  /**
   * Check if a form field has validation errors and has been touched
   * Used to determine whether to display validation errors
   * 
   * @param fieldName - Name of form field to check
   * @returns true if field has errors and has been touched
   */
  hasError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    
    if (!field) {
      return false;
    }

    // Check if field has errors AND has been touched by user
    return field.invalid && this.touched(fieldName);
  }

  /**
   * Check if a form field has been touched by user
   * 
   * @param fieldName - Name of form field to check
   * @returns true if field has been touched
   */
  touched(fieldName: string): boolean {
    const fieldTouched = this.loginForm.get(fieldName)?.touched || false;
    const fieldInSet = this.touchedFields().has(fieldName);
    
    return fieldTouched || fieldInSet;
  }

  /**
   * Mark all form fields as touched
   * Causes validation error messages to display
   * Called when user tries to submit invalid form
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      
      if (control) {
        control.markAsTouched();
        this.touchedFields().add(key);
      }
    });
  }

  /**
   * ==================== REMEMBER ME FUNCTIONALITY ====================
   */

  /**
   * Store remember-me preference in localStorage
   * Can be used to pre-fill email on next login attempt
   * 
   * @param email - Email to remember
   */
  private storeRememberMePreference(email: string): void {
    try {
      localStorage.setItem('rememberedEmail', email);
      localStorage.setItem('rememberMe', 'true');
      console.log('Remember me preference stored');
    } catch (error) {
      console.warn('Could not store remember-me preference:', error);
    }
  }
  /**
   * Clear remember-me preference (e.g., on logout)
   */
  clearRememberMePreference(): void {
    try {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberMe');
      console.log('Remember me preference cleared');
    } catch (error) {
      console.warn('Could not clear remember-me preference:', error);
    }
  }

  /**
   * ==================== UTILITY METHODS ====================
   */

  /**
   * Get error message for a specific form field
   * Returns appropriate error message based on validation error type
   * 
   * @param fieldName - Name of form field
   * @returns Error message string, or empty string if no error
   */
  getFieldErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (!field || !field.errors) {
      return '';
    }

    if (fieldName === 'email') {
      if (field.hasError('required')) {
        return this.ERROR_MESSAGES.EMAIL_REQUIRED;
      }
      if (field.hasError('email')) {
        return this.ERROR_MESSAGES.EMAIL_INVALID;
      }
    }

    if (fieldName === 'password') {
      if (field.hasError('required')) {
        return this.ERROR_MESSAGES.PASSWORD_REQUIRED;
      }
      if (field.hasError('minlength')) {
        return this.ERROR_MESSAGES.PASSWORD_MIN_LENGTH;
      }
    }

    return '';
  }

  /**
   * Reset form to initial state
   * Clears all values, validation states, and errors
   */
  resetForm(): void {
    this.loginForm.reset();
    this.touchedFields.set(new Set());
    this.loginError.set(null);
  }

  /**
   * Get form control value by field name
   * 
   * @param fieldName - Name of form field
   * @returns Form control value, or null if not found
   */
  getFieldValue(fieldName: string): any {
    return this.loginForm.get(fieldName)?.value ?? null;
  }

  /**
   * Check if form has any validation errors
   * 
   * @returns true if form is invalid
   */
  isFormInvalid(): boolean {
    return this.loginForm.invalid;
  }

  /**
   * Check if form can be submitted
   * Form is submittable if valid and not already loading
   * 
   * @returns true if form can be submitted
   */
  canSubmit(): boolean {
    return this.loginForm.valid && !this.isLoading();
  }

  /**
   * Enable or disable entire form
   * 
   * @param enable - true to enable, false to disable
   */
  setFormEnabled(enable: boolean): void {
    if (enable) {
      this.loginForm.enable();
    } else {
      this.loginForm.disable();
    }
  }

  /**
   * ==================== DEBUG METHODS ====================
   */

  /**
   * Get form state for debugging
   * Useful for development and testing
   * 
   * @returns Object containing form state information
   */
  getDebugInfo(): any {
    return {
      isLoading: this.isLoading(),
      showPassword: this.showPassword(),
      loginError: this.loginError(),
      touchedFields: Array.from(this.touchedFields()),
      formValid: this.loginForm.valid,
      formDirty: this.loginForm.dirty,
      formValue: this.loginForm.value,
      formErrors: this.loginForm.errors,
      fieldErrors: {
        email: this.loginForm.get('email')?.errors,
        password: this.loginForm.get('password')?.errors,
      },
    };
  }

  /**
   * Log debug information to console
   */
  logDebugInfo(): void {
    console.table(this.getDebugInfo());
  }
}