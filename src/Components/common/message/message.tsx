import React, { useEffect, useState } from 'react';

type MessageType = 'success' | 'error' | 'warning' | 'info';

interface MessageProps {
  type: MessageType;
  content: string;
  duration?: number;
  onClose?: () => void;
}

const Message: React.FC<MessageProps> = ({ type, content, duration = 3, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // Wait for fade out animation
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <span className="w-4 h-4 text-green-500 text-lg">✓</span>;
      case 'error':
        return <span className="w-4 h-4 text-red-500 text-lg">✗</span>;
      case 'warning':
        return <span className="w-4 h-4 text-yellow-500 text-lg">⚠</span>;
      case 'info':
        return <span className="w-4 h-4 text-blue-500 text-lg">ℹ</span>;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md transition-all duration-300 ease-in-out ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
    >
      <div className={`flex items-center p-6 rounded-lg border shadow-lg min-h-[60px] ${getBgColor()}`}>
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className="flex-1 text-sm font-medium text-gray-900">
          {content}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600"
        >
          <span className="w-4 h-4 text-lg">✗</span>
        </button>
      </div>
    </div>
  );
};

// Message manager
let messageContainer: HTMLDivElement | null = null;
let messageCount = 0;

const createMessageContainer = () => {
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'message-container';
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '16px';
    messageContainer.style.right = '16px';
    messageContainer.style.zIndex = '9999';
    document.body.appendChild(messageContainer);
  }
  return messageContainer;
};

const message = {
  success: (content: string, duration?: number) => {
    const container = createMessageContainer();
    const messageId = `message-${messageCount++}`;
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.style.marginBottom = '8px';
    
    container.appendChild(messageDiv);
    
    const removeMessage = () => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    };

    // Render the message component
    const root = document.createElement('div');
    messageDiv.appendChild(root);
    
    // Simple message without React for now
    const messageElement = document.createElement('div');
    messageElement.className = 'flex items-center p-6 rounded-lg border shadow-lg bg-green-50 border-green-200 max-w-md min-h-[60px]';
    messageElement.innerHTML = `
      <div class="flex-shrink-0 mr-3">
        <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
      </div>
      <div class="flex-1 text-sm font-medium text-gray-900">${content}</div>
      <button class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
      </button>
    `;
    
    messageDiv.appendChild(messageElement);
    
    // Auto remove after duration
    setTimeout(() => {
      messageElement.style.transition = 'all 0.3s ease-in-out';
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateX(100%)';
      setTimeout(removeMessage, 300);
    }, (duration || 3) * 1000);
  },

  error: (content: string, duration?: number) => {
    const container = createMessageContainer();
    const messageId = `message-${messageCount++}`;
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.style.marginBottom = '8px';
    
    container.appendChild(messageDiv);
    
    const removeMessage = () => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    };

    const messageElement = document.createElement('div');
    messageElement.className = 'flex items-center p-6 rounded-lg border shadow-lg bg-red-50 border-red-200 max-w-md min-h-[60px]';
    messageElement.innerHTML = `
      <div class="flex-shrink-0 mr-3">
        <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
        </svg>
      </div>
      <div class="flex-1 text-sm font-medium text-gray-900">${content}</div>
      <button class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
      </button>
    `;
    
    messageDiv.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.style.transition = 'all 0.3s ease-in-out';
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateX(100%)';
      setTimeout(removeMessage, 300);
    }, (duration || 3) * 1000);
  },

  warning: (content: string, duration?: number) => {
    const container = createMessageContainer();
    const messageId = `message-${messageCount++}`;
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.style.marginBottom = '8px';
    
    container.appendChild(messageDiv);
    
    const removeMessage = () => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    };

    const messageElement = document.createElement('div');
    messageElement.className = 'flex items-center p-6 rounded-lg border shadow-lg bg-yellow-50 border-yellow-200 max-w-md min-h-[60px]';
    messageElement.innerHTML = `
      <div class="flex-shrink-0 mr-3">
        <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
      </div>
      <div class="flex-1 text-sm font-medium text-gray-900">${content}</div>
      <button class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
      </button>
    `;
    
    messageDiv.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.style.transition = 'all 0.3s ease-in-out';
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateX(100%)';
      setTimeout(removeMessage, 300);
    }, (duration || 3) * 1000);
  },

  info: (content: string, duration?: number) => {
    const container = createMessageContainer();
    const messageId = `message-${messageCount++}`;
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.style.marginBottom = '8px';
    
    container.appendChild(messageDiv);
    
    const removeMessage = () => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    };

    const messageElement = document.createElement('div');
    messageElement.className = 'flex items-center p-6 rounded-lg border shadow-lg bg-blue-50 border-blue-200 max-w-md min-h-[60px]';
    messageElement.innerHTML = `
      <div class="flex-shrink-0 mr-3">
        <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
        </svg>
      </div>
      <div class="flex-1 text-sm font-medium text-gray-900">${content}</div>
      <button class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
      </button>
    `;
    
    messageDiv.appendChild(messageElement);
    
    setTimeout(() => {
      messageElement.style.transition = 'all 0.3s ease-in-out';
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateX(100%)';
      setTimeout(removeMessage, 300);
    }, (duration || 3) * 1000);
  }
};

export { Message, message };
