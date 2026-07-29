type FormErrorProps = {
  children: React.ReactNode;
  id?: string;
};

export function FormError({ children, id }: FormErrorProps) {
  return (
    <p className="form-error" id={id} role="alert">
      {children}
    </p>
  );
}
