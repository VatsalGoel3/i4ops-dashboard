interface Props {
    title: string;
    children: React.ReactNode;
    description?: string;
  }
  
  export default function SettingsSection({ title, children, description }: Props) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
        <div className="mt-2">{children}</div>
      </div>
    );
  }  