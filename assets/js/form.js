/**
 * form.js - Handles contact form submission via AJAX to Formspree
 */

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('fs-form');
  if (!form) return;

  const status = document.getElementById('form-status');
  const submitBtn = document.getElementById('form-submit');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');

  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'form-status ' + type;
    status.style.display = 'block';
  }

  function setSubmitting(isSubmitting) {
    if (isSubmitting) {
      submitBtn.disabled = true;
      btnText.style.display = 'none';
      btnLoader.style.display = 'inline-flex';
    } else {
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    status.style.display = 'none';

    const data = new FormData(event.target);
    
    try {
      const response = await fetch(event.target.action, {
        method: form.method,
        body: data,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        showStatus("Thanks! Your message has been sent. I'll get back to you soon.", "success");
        form.reset();
      } else {
        const errorData = await response.json();
        if (Object.hasOwn(errorData, 'errors')) {
          showStatus(errorData["errors"].map(error => error["message"]).join(", "), "error");
        } else {
          showStatus("Oops! There was a problem submitting your form. Please try again or email me directly.", "error");
        }
      }
    } catch (error) {
      showStatus("Oops! There was a problem connecting to the server. Please check your internet connection.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  form.addEventListener("submit", handleSubmit);
});
